interface TemplateBadgeProps {
  eventNumber: number;
  eventLabel: string;
  primaryHex: string;
}

export function TemplateBadge({ eventNumber, eventLabel, primaryHex }: TemplateBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold text-white"
      style={{ backgroundColor: primaryHex }}
    >
      <span className="opacity-75">Event {eventNumber}</span>
      <span>&middot;</span>
      <span>{eventLabel}</span>
    </span>
  );
}
