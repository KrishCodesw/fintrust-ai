export type FraudCheckSource = {
  name: string
  flagged: boolean
  detail?: string
}

export type FraudResult = {
  verdict: "SAFE" | "SUSPICIOUS" | "DANGEROUS"
  sources: FraudCheckSource[]
  checkedAt: string
}

async function checkSafeBrowsing(url: string): Promise<FraudCheckSource> {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY
  if (!apiKey) return { name: "Google Safe Browsing", flagged: false, detail: "API key not configured" }

  try {
    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "dispute-resolve", clientVersion: "1.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url }],
          },
        }),
      }
    )
    const data = await response.json()
    const flagged = !!(data.matches && data.matches.length > 0)
    return {
      name: "Google Safe Browsing",
      flagged,
      detail: flagged ? data.matches[0]?.threatType : "No threats detected",
    }
  } catch {
    return { name: "Google Safe Browsing", flagged: false, detail: "Check failed" }
  }
}

async function checkVirusTotal(url: string): Promise<FraudCheckSource> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY
  if (!apiKey) return { name: "VirusTotal", flagged: false, detail: "API key not configured" }

  try {
    const encoded = btoa(url).replace(/=/g, "")
    const response = await fetch(`https://www.virustotal.com/api/v3/urls/${encoded}`, {
      headers: { "x-apikey": apiKey },
    })
    if (!response.ok) return { name: "VirusTotal", flagged: false, detail: "URL not in database" }
    const data = await response.json()
    const stats = data.data?.attributes?.last_analysis_stats ?? {}
    const malicious = (stats.malicious ?? 0) + (stats.suspicious ?? 0)
    return {
      name: "VirusTotal",
      flagged: malicious > 0,
      detail: `${malicious} engines flagged this URL`,
    }
  } catch {
    return { name: "VirusTotal", flagged: false, detail: "Check failed" }
  }
}

export async function checkUrl(url: string): Promise<FraudResult> {
  const [safeBrowsing, virusTotal] = await Promise.all([
    checkSafeBrowsing(url),
    checkVirusTotal(url),
  ])

  const sources = [safeBrowsing, virusTotal]
  const flagCount = sources.filter((s) => s.flagged).length

  const verdict: FraudResult["verdict"] =
    flagCount >= 2 ? "DANGEROUS" : flagCount === 1 ? "SUSPICIOUS" : "SAFE"

  return { verdict, sources, checkedAt: new Date().toISOString() }
}
