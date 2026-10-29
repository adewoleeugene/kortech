"use client";

import { useActionState, useState } from "react";
import { FieldError } from "@/components/field-error";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { type RegisterState, saveOrganisationAction } from "./actions";

type OrgType = "SUPPLIER" | "BUYER" | "LENDER";

export type RegisterDefaults = {
  type: OrgType | "";
  legalName: string;
  regNumber: string;
  address: string;
  districtId: string;
  contactName: string;
  phone: string;
  email: string;
  sellsAgrochemicals: boolean;
};

export type RegisterLabels = Record<
  | "typeLabel" | "typeSUPPLIER" | "typeBUYER" | "typeLENDER" | "legalNameLabel" | "regNumberLabel"
  | "addressLabel" | "districtLabel" | "districtPlaceholder" | "contactNameLabel" | "phoneLabel"
  | "phoneHint" | "emailLabel" | "agrochemicalsLabel" | "agrochemicalsHint" | "save",
  string
>;

const inputClass = "min-h-12 w-full rounded-lg border-2 border-border bg-background px-4 text-lg";
const TYPES: OrgType[] = ["SUPPLIER", "BUYER", "LENDER"];

export function RegisterForm({
  districts,
  defaults,
  labels,
}: {
  districts: { id: string; name: string }[];
  defaults: RegisterDefaults;
  labels: RegisterLabels;
}) {
  const [state, action] = useActionState<RegisterState, FormData>(saveOrganisationAction, {});
  const [type, setType] = useState(defaults.type);
  const errors = state.fieldErrors ?? {};

  const text = (name: keyof RegisterDefaults, label: string, opts: { type?: string; autoComplete?: string; hint?: string } = {}) => (
    <div className="space-y-1">
      <label htmlFor={name} className="block font-semibold">{label}</label>
      <input id={name} name={name} type={opts.type ?? "text"} autoComplete={opts.autoComplete}
        defaultValue={String(defaults[name])} aria-invalid={!!errors[name]}
        aria-describedby={`${name}-hint ${name}-error`} className={inputClass} />
      {opts.hint && <p id={`${name}-hint`} className="text-sm text-muted">{opts.hint}</p>}
      <FieldError id={`${name}-error`} message={errors[name]} />
    </div>
  );

  return (
    <form action={action} className="space-y-6" noValidate>
      <fieldset className="space-y-2" aria-describedby="type-error">
        <legend className="font-semibold">{labels.typeLabel}</legend>
        {TYPES.map((value) => (
          <label key={value} className="flex min-h-12 items-center gap-3 rounded-lg border-2 border-border px-3 py-2 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
            <input type="radio" name="type" value={value} checked={type === value} onChange={() => setType(value)} className="size-5 accent-brand" />
            <span>{labels[`type${value}`]}</span>
          </label>
        ))}
        <FieldError id="type-error" message={errors.type} />
      </fieldset>

      {type === "SUPPLIER" && (
        <div className="space-y-1">
          <label className="flex min-h-12 items-center gap-3 rounded-lg border-2 border-border px-3">
            <input type="checkbox" name="sellsAgrochemicals" defaultChecked={defaults.sellsAgrochemicals} aria-describedby="agro-hint" className="size-5 accent-brand" />
            <span>{labels.agrochemicalsLabel}</span>
          </label>
          <p id="agro-hint" className="text-sm text-muted">{labels.agrochemicalsHint}</p>
        </div>
      )}

      {text("legalName", labels.legalNameLabel, { autoComplete: "organization" })}
      {text("regNumber", labels.regNumberLabel)}
      {text("address", labels.addressLabel, { autoComplete: "street-address" })}

      <div className="space-y-1">
        <label htmlFor="districtId" className="block font-semibold">{labels.districtLabel}</label>
        <select id="districtId" name="districtId" defaultValue={defaults.districtId}
          aria-invalid={!!errors.districtId} aria-describedby="districtId-error" className={inputClass}>
          <option value="">{labels.districtPlaceholder}</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <FieldError id="districtId-error" message={errors.districtId} />
      </div>

      {text("contactName", labels.contactNameLabel, { autoComplete: "name" })}
      {text("phone", labels.phoneLabel, { type: "tel", autoComplete: "tel", hint: labels.phoneHint })}
      {text("email", labels.emailLabel, { type: "email", autoComplete: "email" })}

      <FormMessage error={state.error} />
      <SubmitButton>{labels.save}</SubmitButton>
    </form>
  );
}
