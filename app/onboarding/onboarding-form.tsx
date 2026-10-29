"use client";

import { useActionState, useState } from "react";
import { FieldError } from "@/components/field-error";
import { SubmitButton } from "@/components/submit-button";
import { type OnboardingState, saveProfileAction } from "./actions";

type Option = { id: string; name: string };
type DistrictOption = Option & { chiefdoms: Option[] };

export type OnboardingDefaults = {
  name: string;
  districtId: string;
  chiefdomId: string;
  cropIds: string[];
  farmSize: string;
  farmSizeUnit: "ACRE" | "HECTARE";
};

export type OnboardingLabels = Record<
  | "nameLabel" | "districtLabel" | "districtPlaceholder" | "chiefdomLabel" | "chiefdomPlaceholder"
  | "chiefdomHint" | "cropsLabel" | "cropsHint" | "farmSizeLabel" | "unitLabel" | "unitAcre" | "unitHectare" | "save",
  string
>;

const inputClass = "min-h-12 w-full rounded-lg border-2 border-border bg-background px-4 text-lg";

export function OnboardingForm({
  districts,
  crops,
  defaults,
  labels,
}: {
  districts: DistrictOption[];
  crops: Option[];
  defaults: OnboardingDefaults;
  labels: OnboardingLabels;
}) {
  const [state, action] = useActionState<OnboardingState, FormData>(saveProfileAction, {});
  const [districtId, setDistrictId] = useState(defaults.districtId);
  const errors = state.errors ?? {};
  // Without JavaScript every chiefdom is listed, grouped by district; the server checks the pairing.
  const chiefdomGroups = districtId ? districts.filter((d) => d.id === districtId) : districts;

  return (
    <form action={action} className="space-y-6" noValidate>
      <div className="space-y-1">
        <label htmlFor="name" className="block font-semibold">{labels.nameLabel}</label>
        <input id="name" name="name" autoComplete="name" required defaultValue={defaults.name}
          aria-invalid={!!errors.name} aria-describedby="name-error" className={inputClass} />
        <FieldError id="name-error" message={errors.name} />
      </div>

      <div className="space-y-1">
        <label htmlFor="districtId" className="block font-semibold">{labels.districtLabel}</label>
        <select id="districtId" name="districtId" required value={districtId}
          onChange={(e) => setDistrictId(e.target.value)}
          aria-invalid={!!errors.districtId} aria-describedby="district-error" className={inputClass}>
          <option value="">{labels.districtPlaceholder}</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <FieldError id="district-error" message={errors.districtId} />
      </div>

      <div className="space-y-1">
        <label htmlFor="chiefdomId" className="block font-semibold">{labels.chiefdomLabel}</label>
        <select id="chiefdomId" name="chiefdomId" key={districtId} defaultValue={districtId === defaults.districtId ? defaults.chiefdomId : ""}
          aria-invalid={!!errors.chiefdomId} aria-describedby="chiefdom-hint chiefdom-error" className={inputClass}>
          <option value="">{labels.chiefdomPlaceholder}</option>
          {chiefdomGroups.map((d) => (
            <optgroup key={d.id} label={d.name}>
              {d.chiefdoms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ))}
        </select>
        <p id="chiefdom-hint" className="text-sm text-muted">{labels.chiefdomHint}</p>
        <FieldError id="chiefdom-error" message={errors.chiefdomId} />
      </div>

      <fieldset className="space-y-2" aria-describedby="crops-hint crops-error">
        <legend className="font-semibold">{labels.cropsLabel}</legend>
        <p id="crops-hint" className="text-sm text-muted">{labels.cropsHint}</p>
        <div className="grid grid-cols-2 gap-2">
          {crops.map((c) => (
            <label key={c.id} className="flex min-h-12 items-center gap-3 rounded-lg border-2 border-border px-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft">
              <input type="checkbox" name="cropIds" value={c.id} defaultChecked={defaults.cropIds.includes(c.id)} className="size-5 accent-brand" />
              <span>{c.name}</span>
            </label>
          ))}
        </div>
        <FieldError id="crops-error" message={errors.cropIds} />
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="farmSize" className="block font-semibold">{labels.farmSizeLabel}</label>
        <div className="flex gap-2">
          <input id="farmSize" name="farmSize" type="number" inputMode="decimal" min="0" step="0.01"
            defaultValue={defaults.farmSize} aria-invalid={!!errors.farmSize} aria-describedby="farm-size-error"
            className={`${inputClass} flex-1`} />
          <select name="farmSizeUnit" aria-label={labels.unitLabel} defaultValue={defaults.farmSizeUnit} className={`${inputClass} w-36`}>
            <option value="ACRE">{labels.unitAcre}</option>
            <option value="HECTARE">{labels.unitHectare}</option>
          </select>
        </div>
        <FieldError id="farm-size-error" message={errors.farmSize} />
      </div>

      <SubmitButton>{labels.save}</SubmitButton>
    </form>
  );
}
