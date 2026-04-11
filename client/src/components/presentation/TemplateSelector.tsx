import { getTemplateList, type TemplateId } from "@shared/presentationTemplates";
import { Label } from "@/components/ui/label";

interface TemplateSelectorProps {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
}

export function TemplateSelector({ value, onChange }: TemplateSelectorProps) {
  const templates = getTemplateList();

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        Lesson Template
        <span className="text-xs font-normal text-muted-foreground">
          (based on Gagn&eacute;'s 9 Events of Instruction)
        </span>
      </Label>

      {/* No template option */}
      <button
        type="button"
        onClick={() => onChange("default")}
        className={`w-full text-left rounded-lg border-2 px-4 py-3 transition-colors ${
          value === "default"
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-muted-foreground/30"
        }`}
        data-testid="template-default"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
            &mdash;
          </div>
          <div>
            <p className="text-sm font-semibold">No Template</p>
            <p className="text-xs text-muted-foreground">Use the default format with custom slide count</p>
          </div>
        </div>
      </button>

      {/* Template cards */}
      {templates.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`w-full text-left rounded-lg border-2 px-4 py-3 transition-colors ${
            value === t.id
              ? "bg-opacity-5"
              : "border-border bg-card hover:border-muted-foreground/30"
          }`}
          style={
            value === t.id
              ? { borderColor: t.primaryHex, backgroundColor: t.primaryHex + "10" }
              : {}
          }
          data-testid={`template-${t.id}`}
        >
          <div className="flex items-center gap-3">
            <div
              className="h-8 w-8 rounded-md shrink-0"
              style={{ background: `linear-gradient(135deg, ${t.primaryHex}, ${t.accentHex})` }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{t.name}</p>
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: t.primaryHex }}
                >
                  {t.gradeBand}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {t.tagline} &middot; 9 slides &middot; Gagn&eacute; events
              </p>
            </div>
            {value === t.id && (
              <svg
                className="ml-auto h-4 w-4 shrink-0"
                style={{ color: t.primaryHex }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </button>
      ))}

      {/* Info callout when a template is active */}
      {value !== "default" && (
        <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <strong>9 slides will be generated</strong> &mdash; one per Gagn&eacute; Event of Instruction.
          Slide count is fixed for template presentations.
          Each slide includes embedded teacher tips in the speaker notes.
        </div>
      )}
    </div>
  );
}
