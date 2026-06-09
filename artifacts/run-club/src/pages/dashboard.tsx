import { useGetDashboardSummary, useListClubEvents, getGetDashboardSummaryQueryKey, getListClubEventsQueryKey } from "@workspace/api-client-react";
import { Coffee, Activity, ArrowRight, Award, Footprints, Flame, Trophy, CalendarDays } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isToday, isTomorrow, differenceInDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary, isLoading, isError } = useGetDashboardSummary({
    query: {
      queryKey: getGetDashboardSummaryQueryKey(),
    }
  });

  const { data: events } = useListClubEvents({
    query: { queryKey: getListClubEventsQueryKey() }
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const nextEvent = events?.find(e => e.date >= todayStr) ?? null;

  function eventLabel(dateStr: string): string {
    const d = parseISO(dateStr);
    if (isToday(d)) return "Today!";
    if (isTomorrow(d)) return "Tomorrow";
    const days = differenceInDays(d, new Date());
    return `In ${days} day${days === 1 ? "" : "s"}`;
  }

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (isError || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="bg-destructive/10 text-destructive p-4 rounded-full mb-4">
          <Activity className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold font-serif mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-6">We couldn't load your dashboard data.</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  const {
    totalMiles,
    runCount,
    milesThisMonth = 0,
    milesThisWeek = 0,
    nextRewardTier,
    milesUntilNextReward,
    earnedTiers,
    recentRuns,
    pendingRedemptions,
  } = summary;

  const progressPercentage = nextRewardTier && milesUntilNextReward !== null && milesUntilNextReward !== undefined
    ? Math.min(100, Math.max(0, ((nextRewardTier.milesRequired - milesUntilNextReward) / nextRewardTier.milesRequired) * 100))
    : 100;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight">Your Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back to the club. Let's get moving.</p>
        </div>
        <Button asChild className="rounded-full gap-2 hover:scale-105 transition-transform shadow-md">
          <Link href="/log-run">
            <Footprints className="w-4 h-4" /> Log a Run
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/runs" className="block group">
          <Card className="bg-primary text-primary-foreground border-none shadow-md shadow-primary/20 overflow-hidden relative transition-all duration-200 group-hover:shadow-lg group-hover:scale-[1.02] group-hover:shadow-primary/30 cursor-pointer">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-white/10 w-32 h-32 rounded-full blur-2xl"></div>
            <CardHeader className="pb-2">
              <CardTitle className="text-primary-foreground/80 font-medium text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" /> Total Miles
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold font-serif">{totalMiles.toFixed(1)}</div>
              <p className="text-primary-foreground/80 mt-1 text-sm">{runCount} total runs logged</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="border-border/50 shadow-sm bg-card hover-elevate">
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground font-medium text-sm flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" /> This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold font-serif text-foreground">{milesThisMonth.toFixed(1)} <span className="text-xl text-muted-foreground font-sans font-normal">mi</span></div>
            <p className="text-muted-foreground mt-1 text-sm">{milesThisWeek.toFixed(1)} miles this week</p>
          </CardContent>
        </Card>

        <Link href="/rewards?tab=history" className="block group">
          <Card className="border-border/50 shadow-sm bg-card h-full transition-all duration-200 group-hover:shadow-md group-hover:scale-[1.02] group-hover:border-border cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-muted-foreground font-medium text-sm flex items-center gap-2">
                <Coffee className="w-4 h-4 text-accent-foreground" /> Earned Rewards
                <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold font-serif text-foreground">{earnedTiers.length}</div>
              <p className="text-muted-foreground mt-1 text-sm">
                {pendingRedemptions > 0
                  ? <span className="text-accent-foreground font-medium">{pendingRedemptions} pending redemption{pendingRedemptions > 1 ? 's' : ''}</span>
                  : <span>Keep running for more!</span>
                }
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Link href="/rewards?tab=available" className="block group">
        <Card className="border-border/50 shadow-sm overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:border-border cursor-pointer">
          <CardHeader className="bg-muted/30 border-b border-border/50">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-secondary" />
              {nextRewardTier ? "Next Reward" : "You've unlocked everything!"}
              <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardTitle>
            {nextRewardTier && (
              <CardDescription>
                {milesUntilNextReward?.toFixed(1)} miles left until you unlock: <strong className="text-foreground">{nextRewardTier.name}</strong>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {nextRewardTier ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="text-muted-foreground">Current: {totalMiles.toFixed(1)} mi</span>
                  <span className="text-foreground">Goal: {nextRewardTier.milesRequired} mi</span>
                </div>
                <Progress value={progressPercentage} className="h-3 bg-muted">
                  <div
                    className="h-full bg-secondary transition-all duration-1000 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </Progress>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 text-secondary mb-4">
                  <Trophy className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold font-serif">Incredible Work</h3>
                <p className="text-muted-foreground">You've reached the highest tier! Keep running for the love of it.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>

      {nextEvent && (
        <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden">
          <CardContent className="p-5 flex items-center gap-5">
            <div className="bg-primary/10 text-primary rounded-2xl w-14 h-14 flex flex-col items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5 mb-0.5" />
              <span className="text-xs font-bold leading-none">{format(parseISO(nextEvent.date), "d")}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-foreground">{nextEvent.name}</p>
                <Badge className="bg-primary/15 text-primary border-primary/20 hover:bg-primary/20 text-[11px] font-semibold">
                  {eventLabel(nextEvent.date)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {format(parseISO(nextEvent.date), "EEEE, MMMM d")}
                {nextEvent.description && <> — {nextEvent.description}</>}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold font-serif">Recent Runs</h2>
          <Button variant="ghost" asChild className="text-sm font-medium hover:text-primary">
            <Link href="/runs">View all <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>
        
        {recentRuns.length > 0 ? (
          <div className="grid gap-3">
            {recentRuns.map((run) => (
              <Card key={run.id} className="border-border/40 shadow-none hover:border-border transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary w-12 h-12 rounded-xl flex flex-col items-center justify-center">
                      <span className="text-xs font-bold uppercase">{format(new Date(run.date), "MMM")}</span>
                      <span className="text-lg font-bold leading-none">{format(new Date(run.date), "d")}</span>
                    </div>
                    <div>
                      <p className="font-bold text-lg">{run.distanceMiles} mi</p>
                      {run.notes && <p className="text-sm text-muted-foreground truncate max-w-[200px] md:max-w-md">{run.notes}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed bg-transparent border-border">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Footprints className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No runs logged yet</h3>
              <p className="text-muted-foreground mb-4 text-sm max-w-sm">
                Your journey starts with a single step. Log your first run to start earning rewards.
              </p>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/log-run">Log First Run</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
