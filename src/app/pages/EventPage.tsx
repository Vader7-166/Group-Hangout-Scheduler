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
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm border-border shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <CalendarIcon className="size-6 text-destructive" />
            </div>
            <h2 className="mb-2 text-xl font-semibold tracking-tighter text-destructive">
              Event Not Found
            </h2>
            <p className="text-sm text-muted-foreground">
              This hangout poll may have been removed or the link is incorrect.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter">{event.name}</h1>
              <p className="text-sm text-muted-foreground">Add your availability to the group poll</p>
            </div>
          </div>
        </header>

        <div className="grid gap-12 lg:grid-cols-[400px_1fr]">
          {/* Input Section */}
          <aside className="space-y-12">
            <section className="space-y-6">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your Response</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-border bg-transparent shadow-none"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Availability</label>
                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <Calendar
                      mode="multiple"
                      selected={selectedDates}
                      onSelect={(dates) => setSelectedDates(dates as Date[])}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="p-0"
                    />
                  </div>
                </div>

                {selectedDates.length > 0 && (
                  <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Selected ({selectedDates.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDates
                        .sort((a, b) => a.getTime() - b.getTime())
                        .map((date, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-1 rounded bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground"
                          >
                            {format(date, "MMM d")}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={!name.trim() || selectedDates.length === 0 || isSubmitting}
                  className="w-full"
                >
                  {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Submit Availability
                </Button>
              </div>
            </section>
          </aside>

          {/* Group Availability Section */}
          <main className="space-y-12">
            <section className="space-y-12">
              <div className="grid gap-12 lg:grid-cols-[auto_1fr]">
                {/* Visual Calendar */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Availability Map</h3>
                  <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <TooltipProvider>
                      <Calendar
                        mode="default"
                        className="p-0"
                        components={{
                          DayContent: ({ date }) => {
                            const people = getPeopleForDate(date);
                            const dayNumber = format(date, "d");

                            if (people.length === 0) {
                              return <div className="flex size-full items-center justify-center">{dayNumber}</div>;
                            }

                            const maxVotes = event.submissions.length || 1;
                            const intensity = people.length / maxVotes;
                            
                            return (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="relative flex size-full items-center justify-center">
                                    <span className="relative z-10">{dayNumber}</span>
                                    <div 
                                      className="absolute inset-1 rounded-sm bg-primary"
                                      style={{ opacity: 0.05 + intensity * 0.2 }}
                                    />
                                    <div className="absolute bottom-1 flex gap-0.5">
                                      {people.slice(0, 4).map((person, idx) => {
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
                                  <p className="text-[10px] font-bold uppercase tracking-tight mb-1">{format(date, 'MMMM d')}</p>
                                  <p className="text-xs">{people.map(p => p.name).join(', ')}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          },
                        }}
                      />
                    </TooltipProvider>
                  </div>
                </div>

                {/* Participants Details */}
                <div className="space-y-12">
                  {event.submissions.length > 0 && (
                    <section className="space-y-4">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Most Voted Days</h3>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {(() => {
                          const counts: Record<string, { date: Date; count: number }> = {};
                          event.submissions.forEach((s) => {
                            s.dates.forEach((d) => {
                              const key = format(d, "yyyy-MM-dd");
                              if (!counts[key]) counts[key] = { date: d, count: 0 };
                              counts[key].count++;
                            });
                          });
                          return Object.values(counts)
                            .sort((a, b) => b.count - a.count || a.date.getTime() - b.date.getTime())
                            .slice(0, 3)
                            .map((item, i) => (
                              <Popover key={i}>
                                <PopoverTrigger asChild>
                                  <button className="flex flex-col text-left w-full rounded-lg border bg-card p-3 shadow-sm transition-all hover:border-primary/50 cursor-pointer">
                                    <div className="flex items-center justify-between mb-1 w-full">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Top {i + 1}
                                      </span>
                                      <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                        {item.count}
                                      </span>
                                    </div>
                                    <p className="text-sm font-semibold tracking-tight">
                                      {format(item.date, "EEEE")}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      {format(item.date, "MMMM d, yyyy")}
                                    </p>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2" align="start">
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1 border-b">
                                      Voted by
                                    </p>
                                    <div className="space-y-1 max-h-40 overflow-y-auto pt-1">
                                      {getPeopleForDate(item.date).map((person, idx) => (
                                        <div key={idx} className="flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-muted/50">
                                          <div className={`size-1.5 rounded-full ${PERSON_COLORS[person.colorIndex].bg}`} />
                                          <span className="text-xs font-medium">{person.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ));
                        })()}
                      </div>
                    </section>
                  )}

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Submissions ({event.submissions.length})
                      </h3>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowDetails(!showDetails)}
                        className="h-7 text-[10px] uppercase tracking-widest"
                      >
                        {showDetails ? "Hide Details" : "Show Details"}
                      </Button>
                    </div>

                    {event.submissions.length === 0 ? (
                      <div className="flex h-32 items-center justify-center rounded-lg border border-dashed text-center">
                        <p className="text-sm text-muted-foreground">No responses yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {event.submissions.map((submission, index) => {
                            const color = PERSON_COLORS[index % PERSON_COLORS.length];
                            return (
                              <div
                                key={index}
                                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${color.border} ${color.light}`}
                              >
                                <div className={`size-2 rounded-full ${color.bg}`} />
                                <span className="font-semibold">{submission.name}</span>
                              </div>
                            );
                          })}
                        </div>

                        {showDetails && (
                          <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            {event.submissions.map((submission, index) => {
                              const color = PERSON_COLORS[index % PERSON_COLORS.length];
                              return (
                                <div
                                  key={index}
                                  className={`rounded-lg border p-4 shadow-none ${color.border} ${color.light}`}
                                >
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className={`size-2.5 rounded-full ${color.bg}`} />
                                      <h4 className="text-sm font-semibold">{submission.name}</h4>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground uppercase font-medium tracking-wider">
                                      {submission.dates.length} dates
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {submission.dates
                                      .sort((a, b) => a.getTime() - b.getTime())
                                      .map((date, dateIndex) => (
                                        <div
                                          key={dateIndex}
                                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${color.bg} ${color.text}`}
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
                    )}
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
