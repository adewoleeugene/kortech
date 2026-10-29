"use client";

import { useActionState } from "react";
import { FieldError } from "@/components/field-error";
import { FormMessage } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import type { ListingFormState } from "./actions";

export type ListingDefaults = {
  category: string;
  title: string;
  description: string;
  price: string;
  unit: string;
  districtIds: string[];
  contactPhone: string;
  whatsappNumber: string;
};

export type ListingLabels = Record<
  | "categoryLabel" | "categoryPlaceholder" | "titleLabel" | "titleHint" | "descriptionLabel" | "descriptionHint"
  | "priceLabel" | "priceHint" | "unitLabel" | "unitHint" | "districtsLabel" | "districtsHint" | "contactPhoneLabel"
  | "whatsappLabel" | "photosLabel" | "photosHint" | "save",
  string
>;

const inputClass = "min-h-12 w-full rounded-lg border-2 border-border bg-background px-4 text-lg";

export function ListingForm({
  action,
  categories,
  districts,
  defaults,
  labels,
}: {
  action: (state: ListingFormState, formData: FormData) => Promise<ListingFormState>;
  categories: { value: string; label: string }[];
  districts: { id: string; name: string }[];
  defaults: ListingDefaults;
  labels: ListingLabels;
}) {
  const [state, formAction] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};

  const field = (name: keyof ListingDefaults, label: string, opts: { hint?: string; type?: string; inputMode?: "decimal" | "tel" } = {}) => (
    <div className="space-y-1">
      <label htmlFor={name} className="block font-semibold">{label}</label>
      <input id={name} name={name} type={opts.type ?? "text"} inputMode={opts.inputMode}
        defaultValue={String(defaults[name])} aria-invalid={!!errors[name]}
        aria-describedby={`${name}-hint ${name}-error`} className={inputClass} />
      {opts.hint && <p id={`${name}-hint`} className="text-sm text-muted">{opts.hint}</p>}
      <FieldError id={`${name}-error`} message={errors[name]} />
    </div>
  );

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <div className="space-y-1">
        <label htmlFor="category" className="block font-semibold">{labels.categoryLabel}</label>
        <select id="category" name="category" defaultValue={defaults.category}
          aria-invalid={!!errors.category} aria-describedby="category-error" className={inputClass}>
          <option value="">{labels.categoryPlaceholder}</option>
          {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <FieldError id="category-error" message={errors.category} />
      </div>

      {field("title", labels.titleLabel, { hint: labels.titleHint })}

      <div className="space-y-1">
        <label htmlFor="description" className="block font-semibold">{labels.descriptionLabel}</label>
        <textarea id="description" name="description" rows={4} defaultValue={defaults.description}
          aria-invalid={!!errors.description} aria-describedby="description-hint description-error"
          className="w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-lg" />
        <p id="description-hint" className="text-sm text-muted">{labels.descriptionHint}</p>
        <FieldError id="description-error" message={errors.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {field("price", labels.priceLabel, { hint: labels.priceHint, inputMode: "decimal" })}
        {field("unit", labels.unitLabel, { hint: labels.unitHint })}
      </div>

      <fieldset className="space-y-2" aria-describedby="districts-hint districtIds-error">
        <legend className="font-semibold">{labels.districtsLabel}</legend>
        <p id="districts-hint" className="text-sm text-muted">{labels.districtsHint}</p>
        <div className="grid grid-cols-2 gap-2">
          {districts.map((d) => (
            <label key={d.id} className="flex min-h-12 items-center gap-3 rounded-lg border-2 border-border px-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
              <input type="checkbox" name="districtIds" value={d.id} defaultChecked={defaults.districtIds.includes(d.id)} className="size-5 accent-brand" />
              <span className="text-sm">{d.name}</span>
            </label>
          ))}
        </div>
        <FieldError id="districtIds-error" message={errors.districtIds} />
      </fieldset>

      {field("contactPhone", labels.contactPhoneLabel, { type: "tel", inputMode: "tel" })}
      {field("whatsappNumber", labels.whatsappLabel, { type: "tel", inputMode: "tel" })}

      <div className="space-y-1">
        <label htmlFor="photos" className="block font-semibold">{labels.photosLabel}</label>
        <input id="photos" name="photos" type="file" accept="image/jpeg,image/png" multiple
          aria-describedby="photos-hint photos-error"
          className="block w-full text-sm file:mr-3 file:min-h-12 file:rounded-lg file:border-2 file:border-border file:bg-surface file:px-4 file:font-semibold" />
        <p id="photos-hint" className="text-sm text-muted">{labels.photosHint}</p>
        <FieldError id="photos-error" message={errors.photos} />
      </div>

      <FormMessage error={state.error} />
      <SubmitButton>{labels.save}</SubmitButton>
    </form>
  );
}
