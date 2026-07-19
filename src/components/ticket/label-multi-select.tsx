"use client";

import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { LabelOption } from "./ticket-fields";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/** Sélecteur de labels multiple (cases à cocher dans un menu déroulant). */
export function LabelMultiSelect({
  labels,
  selected,
  onChange,
  disabled,
}: {
  labels: LabelOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const t = useDict();
  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  };
  const count = selected.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start font-normal"
          disabled={disabled || labels.length === 0}
        >
          <Tag className="opacity-60" />
          {labels.length === 0
            ? t.ticketForm.noLabelsAvailable
            : count === 0
              ? t.ticketForm.selectLabels
              : fmt(
                  count > 1
                    ? t.ticketForm.labelsSelectedOther
                    : t.ticketForm.labelsSelectedOne,
                  { count },
                )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 w-60 overflow-y-auto">
        <DropdownMenuLabel>{t.ticketForm.labelsLabel}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {labels.map((label) => (
          <DropdownMenuCheckboxItem
            key={label.id}
            checked={selected.includes(label.id)}
            onCheckedChange={() => toggle(label.id)}
            onSelect={(e) => e.preventDefault()}
          >
            <span className="flex items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: label.color }}
                aria-hidden
              />
              {label.name}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
