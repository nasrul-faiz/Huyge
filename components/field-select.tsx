"use client"

import * as React from "react"
import { ChevronsUpDownIcon } from "lucide-react"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getMachines, type Machine } from "@/lib/machine-store"

interface FieldSelectProps {
  value: string
  onChange: (value: string) => void
  machines?: Machine[]
}

function formatMachineLabel(machine: Machine): string {
  const locationOnly = machine.label
    .replace(new RegExp(`^${machine.value}\\s*[—-]\\s*`), "")
    .trim()
  return `${machine.value} — ${locationOnly}`
}

export function FieldSelect({ value, onChange, machines: machinesProp }: FieldSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [machines, setMachines] = React.useState<Machine[]>(machinesProp ?? [])

  React.useEffect(() => {
    if (!machinesProp) {
      getMachines().then(setMachines)
    }
  }, [machinesProp])

  const selected = machines.find((m) => m.value === value)

  return (
    <div className="w-full max-w-sm">
      <Field>
        <FieldLabel>Machines</FieldLabel>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-8 w-full justify-between rounded-lg px-2.5 font-normal"
            >
              {selected ? formatMachineLabel(selected) : "Choose machines"}
              <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="start"
            avoidCollisions={false}
            className="w-[var(--radix-popover-trigger-width)] max-h-[70vh] overflow-hidden p-0"
          >
            <Command>
              <CommandInput placeholder="Search machine..." />
              <CommandList className="max-h-[60vh]">
                <CommandEmpty>No machine found.</CommandEmpty>
                <CommandGroup>
                  {machines.map((machine) => (
                    <CommandItem
                      key={machine.value}
                      value={`${machine.value} ${machine.label}`}
                      onSelect={() => {
                        onChange(machine.value)
                        setOpen(false)
                      }}
                    >
                      {formatMachineLabel(machine)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <FieldDescription>
          Select your machine to view refill details.
        </FieldDescription>
      </Field>
    </div>
  )
}
