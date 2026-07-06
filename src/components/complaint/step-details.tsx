"use client"

import { UseFormReturn } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type CreateCaseInput } from "@/types/case"

const UPI_APPS = ["Google Pay", "PhonePe", "Paytm", "BHIM", "Amazon Pay", "WhatsApp Pay", "Other"]

interface Props {
  form: UseFormReturn<CreateCaseInput>
}

export function StepDetails({ form }: Props) {
  const { register, setValue, formState: { errors } } = form

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Transaction details</h2>
        <p className="text-sm text-gray-500 mt-1">
          Tell us what happened. The more detail you provide, the better our AI can classify and route your case.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="transactionId">Transaction / UPI reference ID</Label>
          <Input
            id="transactionId"
            placeholder="e.g. UPI202401150001"
            {...register("transactionId")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="upiId">UPI ID of recipient <span className="text-gray-400">(optional)</span></Label>
          <Input id="upiId" placeholder="e.g. merchant@okicici" {...register("upiId")} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount involved (₹)</Label>
          <Input
            id="amount"
            type="number"
            placeholder="e.g. 5000"
            {...register("amount", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bankName">Your bank</Label>
          <Input id="bankName" placeholder="e.g. HDFC Bank" {...register("bankName")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>App used for payment</Label>
        <Select onValueChange={(val) => setValue("appUsed", val)}>
          <SelectTrigger>
            <SelectValue placeholder="Select app" />
          </SelectTrigger>
          <SelectContent>
            {UPI_APPS.map((app) => (
              <SelectItem key={app} value={app}>{app}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">
          Describe what happened <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          rows={5}
          placeholder="e.g. I made a payment of ₹5000 via Google Pay on 15 Jan. The amount was debited but the transaction shows failed. I have not received a refund after 5 days..."
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>
    </div>
  )
}
