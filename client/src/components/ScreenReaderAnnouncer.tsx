import { useEffect, useState } from "react";

interface AnnouncementState {
  message: string;
  politeness: "polite" | "assertive";
  key: number;
}

interface ScreenReaderAnnouncerProps {
  announcement: AnnouncementState | null;
}

export function ScreenReaderAnnouncer({ announcement }: ScreenReaderAnnouncerProps) {
  const [currentAnnouncement, setCurrentAnnouncement] = useState<string>("");
  const [currentPoliteness, setCurrentPoliteness] = useState<"polite" | "assertive">("polite");
  const [currentKey, setCurrentKey] = useState<number>(0);

  useEffect(() => {
    if (announcement && announcement.message) {
      setCurrentAnnouncement(announcement.message);
      setCurrentPoliteness(announcement.politeness);
      setCurrentKey(announcement.key);
      const timer = setTimeout(() => setCurrentAnnouncement(""), 1000);
      return () => clearTimeout(timer);
    }
  }, [announcement]);

  if (!currentAnnouncement) return null;

  return (
    <div
      key={currentKey}
      role="status"
      aria-live={currentPoliteness}
      aria-atomic="true"
      className="sr-only"
    >
      {currentAnnouncement}
    </div>
  );
}

export function useScreenReaderAnnounce() {
  const [announcement, setAnnouncement] = useState<AnnouncementState | null>(null);
  const [announcementKey, setAnnouncementKey] = useState(0);

  const announce = (text: string, politeness: "polite" | "assertive" = "polite") => {
    setAnnouncement(null);
    setTimeout(() => {
      setAnnouncementKey(prev => prev + 1);
      setAnnouncement({ message: text, politeness, key: announcementKey + 1 });
    }, 100);
  };

  return { announcement, announce };
}
