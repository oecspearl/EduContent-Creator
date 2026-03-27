import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mic, Square, Play, Pause, Trash2, Loader2 } from "lucide-react";

type AudioRecorderProps = {
  audioUrl?: string;
  onRecordingComplete: (audioUrl: string) => void;
  onDelete: () => void;
};

export function AudioRecorder({ audioUrl, onRecordingComplete, onDelete }: AudioRecorderProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert to base64
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            onRecordingComplete(base64Audio);
            setIsProcessing(false);
            toast({
              title: "Recording saved!",
              description: "Your narration has been saved to this page.",
            });
          };
          reader.onerror = () => {
            toast({
              title: "Error processing audio",
              description: "Failed to process the recording. Please try again.",
              variant: "destructive",
            });
            setIsProcessing(false);
          };
          reader.readAsDataURL(audioBlob);
        } catch (error) {
          toast({
            title: "Error saving recording",
            description: "Failed to save the recording. Please try again.",
            variant: "destructive",
          });
          setIsProcessing(false);
        }

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: "Recording started",
        description: "Click the stop button when you're done.",
      });
    } catch (error: any) {
      toast({
        title: "Microphone access denied",
        description: error.message || "Please allow microphone access to record narration.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playAudio = () => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
      audioRef.current.onerror = () => {
        toast({
          title: "Playback error",
          description: "Failed to play the audio. Please try again.",
          variant: "destructive",
        });
        setIsPlaying(false);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDelete = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    onDelete();
    toast({
      title: "Narration deleted",
      description: "The audio narration has been removed from this page.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">Voice Narration</h3>
      </div>

      {!audioUrl && !isRecording && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground text-center">
                Record yourself reading this page. Students will be able to listen to your narration.
              </p>
              <Button
                onClick={startRecording}
                disabled={isProcessing}
                className="w-full"
                data-testid="button-start-recording"
              >
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isRecording && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-destructive">
                  Recording: {formatTime(recordingTime)}
                </span>
              </div>
              <Button
                onClick={stopRecording}
                variant="destructive"
                className="w-full"
                data-testid="button-stop-recording"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isProcessing && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Processing recording...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {audioUrl && !isRecording && !isProcessing && (
        <Card className="bg-accent/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={playAudio}
                  data-testid="button-play-audio"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <span className="text-sm text-muted-foreground">
                  Narration recorded
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                data-testid="button-delete-audio"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

