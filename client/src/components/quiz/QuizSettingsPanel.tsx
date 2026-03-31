import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type QuizSettingsPanelProps = {
  settings: {
    shuffleQuestions: boolean;
    showCorrectAnswers: boolean;
    allowRetry: boolean;
    timeLimit: number | undefined;
  };
  onSettingsChange: (settings: QuizSettingsPanelProps["settings"]) => void;
  autosave: boolean;
  onAutosaveChange: (checked: boolean) => void;
};

export function QuizSettingsPanel({
  settings,
  onSettingsChange,
  autosave,
  onAutosaveChange,
}: QuizSettingsPanelProps) {
  return (
    <div className="lg:col-span-1">
      <Card className="sticky top-20">
        <CardHeader>
          <CardTitle>Quiz Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autosave" className="text-base">Autosave</Label>
              <p className="text-xs text-muted-foreground">
                Automatically save changes after 2 seconds
              </p>
            </div>
            <Switch
              id="autosave"
              checked={autosave}
              onCheckedChange={onAutosaveChange}
              data-testid="switch-autosave"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="shuffle">Shuffle Questions</Label>
            <Switch
              id="shuffle"
              checked={settings.shuffleQuestions}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, shuffleQuestions: checked })}
              data-testid="switch-shuffle"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="showAnswers">Show Correct Answers</Label>
            <Switch
              id="showAnswers"
              checked={settings.showCorrectAnswers}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, showCorrectAnswers: checked })}
              data-testid="switch-show-answers"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="retry">Allow Retry</Label>
            <Switch
              id="retry"
              checked={settings.allowRetry}
              onCheckedChange={(checked) => onSettingsChange({ ...settings, allowRetry: checked })}
              data-testid="switch-retry"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
            <Input
              id="timeLimit"
              type="number"
              min="0"
              placeholder="No limit"
              value={settings.timeLimit || ""}
              onChange={(e) =>
                onSettingsChange({ ...settings, timeLimit: e.target.value ? parseInt(e.target.value) : undefined })
              }
              data-testid="input-time-limit"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
