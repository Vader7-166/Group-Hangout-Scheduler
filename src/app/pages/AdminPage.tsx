import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Calendar } from "../components/ui/calendar";
import { format, isSameDay, parseISO } from "date-fns";
import { Plus, Copy, Trash2, ExternalLink, Users, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";

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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-2 border-blue-200 bg-white shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-blue-600 shadow-lg">
              <Users className="size-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">Admin Login</CardTitle>
            <CardDescription>Nhập mã Admin để truy cập hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminAuth} className="space-y-4">
              <Input
                type="password"
                placeholder="Nhập mã Admin..."
                value={adminKeyInput}
                onChange={(e) => setAdminKeyInput(e.target.value)}
                className="border-slate-200 focus-visible:border-blue-500"
              />
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Truy cập
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
    <div className="min-h-screen w-full bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-blue-600 p-4 shadow-lg">
              <Users className="size-12 text-white" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-slate-900 md:text-4xl">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Create and manage hangout events
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Event List */}
          <div className="space-y-6 lg:col-span-1">
            {/* Create Event Card */}
            <Card className="border-2 border-purple-200 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Plus className="size-5" />
                  Create Event
                </CardTitle>
                <CardDescription>Start a new hangout poll</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="text"
                  placeholder="Event name (e.g., Weekend BBQ)"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createEvent()}
                  className="border-purple-200 focus-visible:border-purple-400"
                  disabled={isCreating}
                />
                <Button
                  onClick={createEvent}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={!newEventName.trim() || isCreating}
                >
                  {isCreating ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 size-4" />
                  )}
                  Create Event
                </Button>
              </CardContent>
            </Card>

            {/* Events List */}
            <Card className="border-2 border-blue-200 bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <CalendarIcon className="size-5" />
                  Your Events ({events.length})
                </CardTitle>
                <CardDescription>Click to view details</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="size-8 animate-spin text-blue-500" />
                  </div>
                ) : events.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No events yet. Create one to get started!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {events.map((event, idx) => {
                      const colors = [
                        "bg-blue-500",
                        "bg-purple-500",
                        "bg-green-500",
                        "bg-orange-500",
                        "bg-indigo-500",
                      ];
                      const color = colors[idx % colors.length];
                      return (
                        <div
                          key={event.id}
                          className={`cursor-pointer rounded-lg border-2 p-3 transition-all hover:shadow-lg ${
                            selectedEvent?.id === event.id
                              ? "border-purple-400 bg-purple-50 shadow-md"
                              : "border-gray-200 bg-white hover:border-blue-300"
                          }`}
                          onClick={() => handleSelectEvent(event)}
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`rounded-full ${color} p-1.5`}>
                                <CalendarIcon className="size-3 text-white" />
                              </div>
                              <h3 className="font-semibold">{event.name}</h3>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyEventLink(event.id);
                                }}
                                className="size-7 hover:bg-blue-100 hover:text-blue-600"
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
                                className="size-7 hover:bg-red-100 hover:text-red-600"
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{format(parseISO(event.created_at), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Event Details */}
          <div className="lg:col-span-2">
            {selectedEvent ? (
              <div className="space-y-6">
                {/* Event Header */}
                <Card className="border-2 border-pink-200 bg-white shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-pink-700">
                      <div className="rounded-full bg-pink-500 p-2">
                        <CalendarIcon className="size-4 text-white" />
                      </div>
                      {selectedEvent.name}
                    </CardTitle>
                    <CardDescription>
                      Share this link with participants
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={`${window.location.origin}/event/${selectedEvent.id}`}
                        className="border-pink-200 font-mono text-sm"
                      />
                      <Button
                        onClick={() => copyEventLink(selectedEvent.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Copy className="mr-2 size-4" />
                        Copy
                      </Button>
                      <Button
                        onClick={() => window.open(`/event/${selectedEvent.id}`, "_blank")}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <ExternalLink className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Group Calendar */}
                <Card className="border-2 border-green-200 bg-white shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <div className="rounded-full bg-green-500 p-2">
                        <Users className="size-4 text-white" />
                      </div>
                      Group Availability
                    </CardTitle>
                    <CardDescription>
                      {selectedEvent.submissions?.length || 0} participant
                      {selectedEvent.submissions?.length !== 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!selectedEvent.submissions || selectedEvent.submissions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-4 rounded-full bg-green-500 p-4">
                          <Users className="size-12 text-white" />
                        </div>
                        <p className="text-muted-foreground">
                          No participants yet. Share the event link to get started!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Color Legend */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-green-700">Participants</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedEvent.submissions.map((submission, index) => {
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

                        {/* Visual Calendar */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-green-700">Visual Calendar</p>
                          <div className="flex justify-center rounded-lg border-2 border-green-200 bg-white p-2 shadow-inner">
                            <Calendar
                              mode="default"
                              className="rounded-md"
                              components={{
                                DayContent: ({ date }) => {
                                  const people = getPeopleForDate(date, selectedEvent);
                                  const dayNumber = format(date, "d");

                                  if (people.length === 0) {
                                    return <div>{dayNumber}</div>;
                                  }

                                  return (
                                    <div className="relative size-full">
                                      <div className="mb-1">{dayNumber}</div>
                                      <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 gap-0.5">
                                        {people.slice(0, 3).map((person, idx) => {
                                          const color = PERSON_COLORS[person.colorIndex];
                                          return (
                                            <div
                                              key={idx}
                                              className={`size-1.5 rounded-full ${color.bg}`}
                                              title={person.name}
                                            />
                                          );
                                        })}
                                        {people.length > 3 && (
                                          <div className="size-1.5 rounded-full bg-gray-400" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                },
                              }}
                              modifiers={{
                                selected: (date) => getPeopleForDate(date, selectedEvent).length > 0,
                              }}
                              modifiersClassNames={{
                                selected: "bg-accent/30 font-semibold",
                              }}
                            />
                          </div>
                        </div>

                        {/* Participants Details */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-green-700">Details</p>
                          <div className="space-y-3">
                            {selectedEvent.submissions.map((submission, index) => {
                              const color = PERSON_COLORS[index % PERSON_COLORS.length];
                              return (
                                <div
                                  key={index}
                                  className={`rounded-lg border-2 ${color.border} ${color.light} p-3 shadow-sm`}
                                >
                                  <div className="mb-2 flex items-center gap-2">
                                    <div className={`size-3 rounded-full ${color.bg}`} />
                                    <h3 className="font-semibold">{submission.name}</h3>
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
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="h-full border-2 border-blue-200 bg-white shadow-lg">
                <CardContent className="flex h-full min-h-[400px] items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 rounded-full bg-blue-600 p-4">
                      <CalendarIcon className="size-16 text-white" />
                    </div>
                    <p className="font-semibold text-blue-600">
                      Select an event to view details
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
