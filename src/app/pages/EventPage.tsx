import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { Calendar } from "../components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { format, isSameDay, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Users, ArrowLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";

interface Submission {
  name: string;
  dates: Date[];
}

interface Event {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  submissions: Submission[];
}

const PERSON_COLORS = [
  { bg: "bg-blue-500", text: "text-white", light: "bg-blue-100", border: "border-blue-500" },
  { bg: "bg-purple-500", text: "text-white", light: "bg-purple-100", border: "border-purple-500" },
  { bg: "bg-green-500", text: "text-white", light: "bg-green-100", border: "border-green-500" },
  { bg: "bg-orange-500", text: "text-white", light: "bg-orange-100", border: "border-orange-500" },
  { bg: "bg-pink-500", text: "text-white", light: "bg-pink-100", border: "border-pink-500" },
  { bg: "bg-teal-500", text: "text-white", light: "bg-teal-100", border: "border-teal-500" },
  { bg: "bg-red-500", text: "text-white", light: "bg-red-100", border: "border-red-500" },
  { bg: "bg-indigo-500", text: "text-white", light: "bg-indigo-100", border: "border-indigo-500" },
  { bg: "bg-yellow-500", text: "text-gray-900", light: "bg-yellow-100", border: "border-yellow-500" },
  { bg: "bg-cyan-500", text: "text-white", light: "bg-cyan-100", border: "border-cyan-500" },
];

export default function EventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState("");
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventData();

      // Set up Realtime listener
      const channel = supabase
        .channel(`event-votes-${eventId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'votes',
            filter: `event_id=eq.${eventId}`
          },
          () => {
            fetchSubmissions(); // Re-fetch submissions on change
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [eventId]);

  const fetchEventData = async () => {
    setIsLoading(true);
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (eventError || !eventData) {
      setIsLoading(false);
      return;
    }

    const { data: votesData, error: votesError } = await supabase
      .from("votes")
      .select("*")
      .eq("event_id", eventId);

    if (votesError) {
      console.error(votesError);
    }

    const submissions = (votesData || []).map(vote => ({
      name: vote.participant_name,
      dates: vote.dates.map((d: string) => parseISO(d))
    }));

    setEvent({ ...eventData, submissions });
    setIsLoading(false);
  };

  const fetchSubmissions = async () => {
    const { data, error } = await supabase
      .from("votes")
      .select("*")
      .eq("event_id", eventId);

    if (error) {
      console.error(error);
      return;
    }

    const submissions = (data || []).map(vote => ({
      name: vote.participant_name,
      dates: vote.dates.map((d: string) => parseISO(d))
    }));

    setEvent(prev => prev ? { ...prev, submissions } : null);
  };

  const handleSubmit = async () => {
    if (name.trim() && selectedDates.length > 0 && eventId) {
      setIsSubmitting(true);
      const dateStrings = selectedDates.map(d => format(d, 'yyyy-MM-dd'));
      
      const { error } = await supabase
        .from("votes")
        .insert([{
          event_id: eventId,
          participant_name: name.trim(),
          dates: dateStrings
        }]);

      if (error) {
        toast.error("Failed to submit availability");
        console.error(error);
      } else {
        toast.success("Your availability has been submitted!");
        setName("");
        setSelectedDates([]);
      }
      setIsSubmitting(false);
    }
  };

  const getPeopleForDate = (date: Date) => {
    if (!event) return [];
    return event.submissions
      .map((submission, index) => ({
        ...submission,
        colorIndex: index % PERSON_COLORS.length,
      }))
      .filter((submission) =>
        submission.dates.some((d) => isSameDay(d, date))
      );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-2 border-red-200 bg-white shadow-xl">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-red-500 p-4">
              <CalendarIcon className="size-16 text-white" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-red-600">
              Sự kiện này đã bị xóa
            </h2>
            <p className="text-muted-foreground">
              Vui lòng liên hệ với người tổ chức để biết thêm chi tiết.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="animate-pulse rounded-full bg-blue-600 p-4 shadow-lg">
              <Users className="size-12 text-white" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900 md:text-4xl">
            {event.name}
          </h1>
          <p className="text-muted-foreground">
            Select the dates you're available to hang out!
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Section */}
          <Card className="border-2 border-purple-200 bg-white shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <div className="rounded-full bg-purple-500 p-2">
                  <CalendarIcon className="size-4 text-white" />
                </div>
                Your Availability
              </CardTitle>
              <CardDescription>
                Enter your name and select all dates you're free
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-purple-700">
                  Your Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border-purple-200 focus-visible:border-purple-400"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-purple-700">Select Available Dates</label>
                <div className="flex justify-center rounded-lg border-2 border-purple-200 bg-white p-2 shadow-inner">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates as Date[])}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-md"
                  />
                </div>
              </div>

              {selectedDates.length > 0 && (
                <div className="space-y-2 rounded-lg bg-purple-50 p-3">
                  <p className="text-sm font-medium text-purple-700">
                    Selected Dates ({selectedDates.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedDates
                      .sort((a, b) => a.getTime() - b.getTime())
                      .map((date, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-1 rounded-full bg-purple-600 px-3 py-1 text-sm text-white shadow-md"
                        >
                          <CalendarIcon className="size-3" />
                          {format(date, "MMM d, yyyy")}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || selectedDates.length === 0 || isSubmitting}
                className="w-full bg-purple-600 text-lg font-semibold shadow-lg hover:bg-purple-700 hover:shadow-xl"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 size-5 animate-spin" />
                ) : null}
                Submit My Availability
              </Button>
            </CardContent>
          </Card>

          {/* Group Availability Section */}
          <Card className="border-2 border-green-200 bg-white shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <div className="rounded-full bg-green-500 p-2">
                  <Users className="size-4 text-white" />
                </div>
                Group Availability
              </CardTitle>
              <CardDescription>
                See when everyone is free
              </CardDescription>
            </CardHeader>
            <CardContent>
              {event.submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 rounded-full bg-green-500 p-4">
                    <Users className="size-12 text-white" />
                  </div>
                  <p className="text-muted-foreground">
                    No submissions yet. Be the first to add your availability!
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Color Legend */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-700">Participants</p>
                    <div className="flex flex-wrap gap-2">
                      {event.submissions.map((submission, index) => {
                        const color = PERSON_COLORS[index % PERSON_COLORS.length];
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm shadow-sm"
                          >
                            <div className={`size-3 rounded-full ${color.bg}`} />
                            <span>{submission.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Group Calendar with Tooltips */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-700">Visual Calendar (Heatmap)</p>
                    <div className="flex justify-center rounded-lg border-2 border-green-200 bg-white p-2 shadow-inner">
                      <TooltipProvider>
                        <Calendar
                          mode="default"
                          className="rounded-md"
                          components={{
                            DayContent: ({ date }) => {
                              const people = getPeopleForDate(date);
                              const dayNumber = format(date, "d");

                              if (people.length === 0) {
                                return <div>{dayNumber}</div>;
                              }

                              // Calculate opacity based on vote count (heatmap)
                              const maxVotes = Math.max(...event.submissions.map(() => 1), event.submissions.length);
                              const intensity = Math.min(people.length / (maxVotes || 1), 1);
                              
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div 
                                      className="relative flex size-full items-center justify-center rounded-sm"
                                      style={{ 
                                        backgroundColor: `rgba(34, 197, 94, ${0.1 + intensity * 0.4})`, // Green intensity
                                        color: intensity > 0.5 ? 'white' : 'inherit'
                                      }}
                                    >
                                      <div className="z-10">{dayNumber}</div>
                                      <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                                        {people.slice(0, 3).map((person, idx) => {
                                          const color = PERSON_COLORS[person.colorIndex];
                                          return (
                                            <div
                                              key={idx}
                                              className={`size-1 rounded-full ${color.bg}`}
                                            />
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-semibold">{format(date, 'MMM d')}</p>
                                    <p className="text-xs">Free: {people.map(p => p.name).join(', ')}</p>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            },
                          }}
                          modifiers={{
                            selected: (date) => getPeopleForDate(date).length > 0,
                          }}
                          modifiersClassNames={{
                            selected: "bg-transparent font-semibold",
                          }}
                        />
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Collapsible Details */}
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowDetails(!showDetails)}
                      className="flex w-full items-center justify-between border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                    >
                      <span className="flex items-center gap-2">
                        <Users className="size-4" />
                        {showDetails ? "Hide Participant Details" : "Show Participant Details"}
                      </span>
                      {showDetails ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </Button>

                    {showDetails && (
                      <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        {event.submissions.map((submission, index) => {
                          const color = PERSON_COLORS[index % PERSON_COLORS.length];
                          return (
                            <div
                              key={index}
                              className={`rounded-lg border-2 ${color.border} ${color.light} p-3 shadow-sm`}
                            >
                              <div className="mb-2 flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`size-3 rounded-full ${color.bg}`} />
                                  <h3 className="font-semibold">{submission.name}</h3>
                                </div>
                              </div>
                              <p className="mb-2 text-sm text-muted-foreground">
                                Available on {submission.dates.length} date
                                {submission.dates.length !== 1 ? "s" : ""}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {submission.dates
                                  .sort((a, b) => a.getTime() - b.getTime())
                                  .map((date, dateIndex) => (
                                    <div
                                      key={dateIndex}
                                      className={`rounded-md ${color.bg} ${color.text} px-2 py-1 text-xs font-medium`}
                                    >
                                      {format(date, "MMM d")}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
