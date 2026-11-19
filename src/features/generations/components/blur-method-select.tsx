"use client"

import type { BlurMethod } from "@blurfield/js"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { blur_methods } from "@/lib/backend-client"

type BlurMethodSelectProps = {
  value?: BlurMethod | null
  onChange: (value: BlurMethod) => void
  disabled?: boolean
}

const label = (method: BlurMethod) =>
  method.charAt(0).toUpperCase() + method.slice(1)

export const BlurMethodSelect = ({ value, onChange, disabled }: BlurMethodSelectProps) => {
  return (
    <Select
      value={value ?? ""}
      onValueChange={(next) => onChange(next as BlurMethod)}
      disabled={disabled}
    >
      <SelectTrigger aria-label="Blur method" className="w-full">
        <SelectValue placeholder="Select blur method" />
      </SelectTrigger>
      <SelectContent>
        {blur_methods.map((method) => (
          <SelectItem key={method} value={method}>
            {label(method)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
