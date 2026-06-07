import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Calendar } from "../components/ui/calendar";
import { format, isSameDay, parseISO } from "date-fns";
import { Plus, Copy, Trash2, ExternalLink, Users, Calendar as CalendarIcon, Loader2 } from "lucide-react";
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
  submissions?: Submission[];
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

export default function AdminPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [newEventName, setNewEventName] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const savedKey = sessionStorage.getItem("admin_auth");
    if (savedKey === import.meta.env.VITE_ADMIN_KEY) {
      setIsAuthenticated(true);
      fetchEvents();
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleAdminAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKeyInput === import.meta.env.VITE_ADMIN_KEY) {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin_auth", adminKeyInput);
      fetchEvents();
    } else {
      toast.error("Sai mã Admin!");
    }
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch events");
      console.error(error);
    } else {
      setEvents(data || []);
    }
    setIsLoading(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm border-border shadow-none">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/5">
              <Users className="size-6 text-primary" />
            </div>
            <CardTitle className="text-xl font-semibold tracking-tighter">Admin Login</CardTitle>
            <CardDescription>Enter your admin key to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminAuth} className="space-y-4">
              <Input
                type="password"
                placeholder="Admin Key"
                value={adminKeyInput}
                onChange={(e) => setAdminKeyInput(e.target.value)}
                className="border-border focus-visible:ring-primary/20"
              />
              <Button type="submit" className="w-full">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fetchEventSubmissions = async (eventId: string) => {
    const { data, error } = await supabase
      .from("votes")
      .select("*")
      .eq("event_id", eventId);

    if (error) {
      toast.error("Failed to fetch submissions");
      console.error(error);
      return [];
    }
    
    return (data || []).map(vote => ({
      name: vote.participant_name,
      dates: vote.dates.map((d: string) => parseISO(d))
    }));
  };

  const handleSelectEvent = async (event: Event) => {
    const submissions = await fetchEventSubmissions(event.id);
    setSelectedEvent({ ...event, submissions });
  };

  const createEvent = async () => {
    if (newEventName.trim()) {
      setIsCreating(true);
      const { data, error } = await supabase
        .from("events")
        .insert([{ name: newEventName.trim() }])
        .select()
        .single();

      if (error) {
        toast.error("Failed to create event");
        console.error(error);
      } else {
        setEvents([data, ...events]);
        setNewEventName("");
        toast.success("Event created!");
      }
      setIsCreating(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (error) {
      toast.error("Failed to delete event");
      console.error(error);
    } else {
      setEvents(events.filter((e) => e.id !== eventId));
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(null);
      }
      toast.success("Event deleted");
    }
  };

  const copyEventLink = (eventId: string) => {
    const link = `${window.location.origin}/event/${eventId}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard!");
  };

  const getPeopleForDate = (date: Date, event: Event) => {
    if (!event.submissions) return [];
    return event.submissions
      .map((submission, index) => ({
        ...submission,
        colorIndex: index % PERSON_COLORS.length,
      }))
      .filter((submission) =>
        submission.dates.some((d) => isSameDay(d, date))
      );
  };

  return (
    <div className="min-h-screen w-full bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Users className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tighter">Hangout Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage your group availability polls</p>
            </div>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          {/* Left Column - Event List */}
          <aside className="space-y-8">
            {/* Create Event */}
            <section className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">New Event</h2>
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Event name..."
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createEvent()}
                  className="border-border bg-transparent shadow-none"
                  disabled={isCreating}
                />
                <Button
                  onClick={createEvent}
                  className="w-full"
                  disabled={!newEventName.trim() || isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 size-4" />
                  )}
                  Create
                </Button>
              </div>
            </section>

            {/* Events List */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Events ({events.length})
                </h2>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : events.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No events found.</p>
              ) : (
                <div className="divide-y divide-border border-y border-border">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className={`group relative py-4 transition-colors hover:bg-accent/50 ${
                        selectedEvent?.id === event.id ? "bg-accent/30" : ""
                      }`}
                    >
                      <div 
                        className="cursor-pointer px-1"
                        onClick={() => handleSelectEvent(event)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <h3 className={`text-sm font-medium ${selectedEvent?.id === event.id ? "text-primary" : "text-foreground"}`}>
                            {event.name}
                          </h3>
                          <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyEventLink(event.id);
                              }}
                              className="size-7"
                            >
                              <Copy className="size-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteEvent(event.id);
                              }}
                              className="size-7 hover:text-destructive"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="mt-1 text-[10px] text-muted-foreground uppercase tracking-tight">
                          {format(parseISO(event.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>

          {/* Right Column - Event Details */}
          <main>
            {selectedEvent ? (
              <div className="space-y-12">
                {/* Event Header & Link */}
                <section className="space-y-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 className="text-3xl font-bold tracking-tighter">{selectedEvent.name}</h2>
                      <p className="text-sm text-muted-foreground mt-1">Invite participants with the link below</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => copyEventLink(selectedEvent.id)}
                        className="h-9"
                      >
                        <Copy className="mr-2 size-3.5" />
                        Copy Link
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => window.open(`/event/${selectedEvent.id}`, "_blank")}
                        className="h-9"
                      >
                        <ExternalLink className="mr-2 size-3.5" />
                        View Live
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
                    <code className="flex-1 px-2 text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                      {`${window.location.origin}/event/${selectedEvent.id}`}
                    </code>
                  </div>
                </section>

                {/* Group Calendar & Details */}
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
                                    const people = getPeopleForDate(date, selectedEvent);
                                    const dayNumber = format(date, "d");

                                    if (people.length === 0) {
                                      return <div className="flex size-full items-center justify-center">{dayNumber}</div>;
                                    }

                                    return (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="relative flex size-full items-center justify-center">
                                            <span className="relative z-10">{dayNumber}</span>
                                            <div className="absolute inset-1 rounded-sm bg-primary/5" />
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
                    {/* Participants List */}
                    <div className="space-y-8">
                      {selectedEvent.submissions && selectedEvent.submissions.length > 0 && (
                        <section className="space-y-4">
                          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Most Voted Days</h3>
                          <div className="grid gap-3 sm:grid-cols-3">
                            {(() => {
                              const counts: Record<string, { date: Date; count: number }> = {};
                              selectedEvent.submissions.forEach((s) => {
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
                                          {getPeopleForDate(item.date, selectedEvent).map((person, idx) => (
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
                            Submissions ({selectedEvent.submissions?.length || 0})
                          </h3>
                        </div>

                        {!selectedEvent.submissions || selectedEvent.submissions.length === 0 ? (
                          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border text-center">
                            <p className="text-sm text-muted-foreground">No responses yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedEvent.submissions.map((submission, index) => {
                              const color = PERSON_COLORS[index % PERSON_COLORS.length];
                              return (
                                <div
                                  key={index}
                                  className={`group rounded-lg border p-4 transition-all ${color.border} ${color.light} shadow-sm`}
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
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/10 text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
                  <CalendarIcon className="size-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Select an event to view group availability
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
