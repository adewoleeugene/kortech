"use client";

import { useActionState, useState } from "react";
import { FieldError } from "@/components/field-error";
import { SubmitButton } from "@/components/submit-button";
import { type PhotosState, uploadFarmerPhotosAction } from "./actions";

type PhotoType = "FARM" | "ID_CARD" | "SELFIE";
type Field = { type: PhotoType; label: string; hint: string; done: boolean };

// Phone photos are often 3-10 MB; the server accepts about 4 MB per request in total.
// Shrink each one in the browser first, which also saves farmers' mobile data.
const MAX_SIDE = 1600;

async function shrinkImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file; // Unsupported format: let the server check it.
  }
}

export function PhotosForm({ fields, submitLabel, replaceLabel }: { fields: Field[]; submitLabel: string; replaceLabel: string }) {
  const [state, action] = useActionState<PhotosState, FormData>(uploadFarmerPhotosAction, {});
  const [previews, setPreviews] = useState<Partial<Record<PhotoType, string>>>({});

  async function onChange(type: PhotoType, input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    const small = await shrinkImage(file);
    const transfer = new DataTransfer();
    transfer.items.add(small);
    input.files = transfer.files;
    setPreviews((p) => ({ ...p, [type]: URL.createObjectURL(small) }));
  }

  return (
    <form action={action} className="space-y-6">
      {fields.map((field) => {
        const id = `photo-${field.type}`;
        const error = state.errors?.[field.type];
        const preview = previews[field.type];
        return (
          <div key={field.type} className="space-y-2 rounded-2xl border border-border p-4">
            <label htmlFor={id} className="block font-bold">
              {field.label}
            </label>
            <p id={`${id}-hint`} className="text-sm text-muted">
              {field.done ? replaceLabel : field.hint}
            </p>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a served image
              <img src={preview} alt="" className="h-40 w-full rounded-xl object-cover" />
            )}
            <input
              id={id}
              name={field.type}
              type="file"
              accept="image/jpeg,image/png"
              capture={field.type === "SELFIE" ? "user" : "environment"}
              required={!field.done}
              aria-describedby={`${id}-hint`}
              aria-invalid={error ? true : undefined}
              onChange={(e) => onChange(field.type, e.currentTarget)}
              className="block w-full text-sm file:mr-3 file:min-h-12 file:rounded-lg file:border-2 file:border-border file:bg-surface file:px-4 file:font-semibold"
            />
            <FieldError id={`${id}-error`} message={error} />
          </div>
        );
      })}
      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
