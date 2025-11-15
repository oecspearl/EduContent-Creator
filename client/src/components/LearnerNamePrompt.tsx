import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle, X } from "lucide-react";

const LEARNER_NAME_KEY = "oecs-learner-name";

type LearnerNamePromptProps = {
  onNameSet: (name: string | null) => void;
  isAuthenticated: boolean;
};

export function LearnerNamePrompt({ onNameSet, isAuthenticated }: LearnerNamePromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [name, setName] = useState("");
  const [hasDecided, setHasDecided] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setShowPrompt(false);
      setHasDecided(true);
      return;
    }

    // Check if user has already provided or declined to provide name
    const storedName = localStorage.getItem(LEARNER_NAME_KEY);
    const hasDeclinedKey = localStorage.getItem(`${LEARNER_NAME_KEY}-declined`);
    
    if (storedName) {
      setName(storedName);
      onNameSet(storedName);
      setHasDecided(true);
    } else if (hasDeclinedKey === "true") {
      setHasDecided(true);
      onNameSet(null);
    } else {
      // Show prompt for first-time anonymous users
      setShowPrompt(true);
    }
  }, [isAuthenticated, onNameSet]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (trimmedName) {
      localStorage.setItem(LEARNER_NAME_KEY, trimmedName);
      localStorage.removeItem(`${LEARNER_NAME_KEY}-declined`);
      onNameSet(trimmedName);
    } else {
      localStorage.setItem(`${LEARNER_NAME_KEY}-declined`, "true");
      localStorage.removeItem(LEARNER_NAME_KEY);
      onNameSet(null);
    }
    setShowPrompt(false);
    setHasDecided(true);
  };

  const handleSkip = () => {
    localStorage.setItem(`${LEARNER_NAME_KEY}-declined`, "true");
    localStorage.removeItem(LEARNER_NAME_KEY);
    onNameSet(null);
    setShowPrompt(false);
    setHasDecided(true);
  };

  if (!showPrompt || isAuthenticated || hasDecided) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                <UserCircle className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Welcome!</CardTitle>
                <CardDescription>Optional: Tell us your name</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSkip} data-testid="button-close-prompt">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Help your instructor track your progress by providing your name. This is completely optional - you can skip this and remain anonymous.
          </p>
          <div className="space-y-3">
            <Input
              type="text"
              placeholder="Enter your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              data-testid="input-learner-name"
              autoFocus
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleSubmit} 
                className="flex-1"
                data-testid="button-submit-name"
              >
                {name.trim() ? "Continue with Name" : "Continue Anonymously"}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSkip}
                data-testid="button-skip-name"
              >
                Skip
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export utility function to get stored learner name
export function getStoredLearnerName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LEARNER_NAME_KEY);
}

// Export utility function to clear learner name
export function clearLearnerName() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEARNER_NAME_KEY);
  localStorage.removeItem(`${LEARNER_NAME_KEY}-declined`);
}
