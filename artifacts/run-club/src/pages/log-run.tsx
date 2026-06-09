import { useLogRun, useListMyDependents, getGetDashboardSummaryQueryKey, getListMyDependentsQueryKey, getListMyRunsQueryKey } from "@workspace/api-client-react";
import { useGetMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Footprints, Loader2, Users } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const logRunSchema = z.object({
  distanceMiles: z.coerce.number().min(0.1, "Distance must be at least 0.1 miles").max(200, "Distance seems a bit too high"),
  date: z.date({ required_error: "A date is required" }),
  notes: z.string().max(500, "Notes are too long").optional(),
  forUserId: z.string().optional(),
});

type LogRunValues = z.infer<typeof logRunSchema>;

export default function LogRun() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const logRunMutation = useLogRun();

  const { data: profile } = useGetMyProfile({ query: { queryKey: getGetMyProfileQueryKey() } });
  const { data: dependents = [] } = useListMyDependents({ query: { queryKey: getListMyDependentsQueryKey() } });

  const hasDependents = dependents.length > 0;

  const form = useForm<LogRunValues>({
    resolver: zodResolver(logRunSchema),
    defaultValues: {
      distanceMiles: undefined,
      date: new Date(),
      notes: "",
      forUserId: undefined,
    },
  });

  const selectedUserId = form.watch("forUserId");

  // Build the full list of who you can log for
  const runnerOptions = profile
    ? [
        { userId: profile.userId, displayName: profile.displayName, isSelf: true },
        ...dependents.map((d) => ({ userId: d.userId, displayName: d.displayName, isSelf: false })),
      ]
    : [];

  const selectedRunner = runnerOptions.find((r) => r.userId === selectedUserId) ?? runnerOptions[0];

  const onSubmit = (data: LogRunValues) => {
    const forUserId = data.forUserId && data.forUserId !== profile?.userId ? data.forUserId : undefined;

    logRunMutation.mutate(
      {
        data: {
          distanceMiles: data.distanceMiles,
          date: format(data.date, "yyyy-MM-dd"),
          notes: data.notes || undefined,
          forUserId,
        },
      },
      {
        onSuccess: () => {
          const runnerName = forUserId
            ? dependents.find((d) => d.userId === forUserId)?.displayName ?? "them"
            : "you";
          toast.success("Run logged!", {
            description: forUserId
              ? `Logged ${data.distanceMiles} mi for ${runnerName}.`
              : `Great job on your ${data.distanceMiles} mile run.`,
          });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListMyRunsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListMyDependentsQueryKey() });
          setLocation("/dashboard");
        },
        onError: (error) => {
          toast.error("Failed to log run", {
            description: (error as any).error || "Please try again later.",
          });
        },
      }
    );
  };

  return (
    <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
          <Footprints className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold font-serif">Log a Run</h1>
        <p className="text-muted-foreground mt-2">Add miles to track progress towards the next reward.</p>
      </div>

      <Card className="border-border shadow-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Who ran? — only shown if there are dependents */}
            {hasDependents && (
              <CardHeader className="pb-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Who ran?
                </CardTitle>
                <CardDescription>Select yourself or a family member.</CardDescription>
                <FormField
                  control={form.control}
                  name="forUserId"
                  render={({ field }) => (
                    <FormItem className="pt-3">
                      <FormControl>
                        <div className="flex flex-wrap gap-2">
                          {runnerOptions.map((runner) => {
                            const isSelected =
                              field.value === runner.userId ||
                              (!field.value && runner.isSelf);
                            const initials = runner.displayName.substring(0, 2).toUpperCase();
                            return (
                              <button
                                key={runner.userId}
                                type="button"
                                onClick={() => field.onChange(runner.userId)}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2 rounded-full border text-sm font-medium transition-all",
                                  isSelected
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border bg-background text-foreground hover:border-primary/50"
                                )}
                              >
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback
                                    className={cn(
                                      "text-xs font-bold",
                                      isSelected
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                {runner.isSelf ? `${runner.displayName} (me)` : runner.displayName}
                              </button>
                            );
                          })}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardHeader>
            )}

            <CardContent className={cn("space-y-6", hasDependents ? "pt-6" : "pt-6")}>
              <FormField
                control={form.control}
                name="distanceMiles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Distance (miles)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 3.1"
                          className="text-2xl h-14 pl-4 pr-16 font-serif placeholder:font-sans"
                          {...field}
                          value={field.value ?? ""}
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          mi
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-base font-semibold">Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full h-12 pl-4 text-left font-normal text-base",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-5 w-5 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="How did it feel? What route did you take?"
                        className="resize-none h-24"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {selectedRunner && !selectedRunner.isSelf
                        ? `Visible to admins only.`
                        : `Only visible to you.`}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="bg-muted/30 border-t border-border/50 py-4 flex justify-between">
              <Button type="button" variant="ghost" onClick={() => setLocation("/dashboard")}>
                Cancel
              </Button>
              <Button type="submit" size="lg" className="rounded-full px-8" disabled={logRunMutation.isPending}>
                {logRunMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving...
                  </>
                ) : selectedRunner && !selectedRunner.isSelf ? (
                  `Log Run for ${selectedRunner.displayName}`
                ) : (
                  "Log Run"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
