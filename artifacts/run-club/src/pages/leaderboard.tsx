import { useState } from "react";
import { useGetLeaderboard, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import type { GetLeaderboardPeriod } from "@workspace/api-client-react";
import { Trophy, Medal, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export default function Leaderboard() {
  const [period, setPeriod] = useState<GetLeaderboardPeriod>('thisweek');

  const { data: leaderboard, isLoading } = useGetLeaderboard(
    { period },
    {
      query: {
        queryKey: getGetLeaderboardQueryKey({ period }),
      }
    }
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" /> Leaderboard
          </h1>
          <p className="text-muted-foreground mt-2">The neighborhood pacesetters.</p>
        </div>
        
        <ToggleGroup type="single" value={period} onValueChange={(v) => v && setPeriod(v as GetLeaderboardPeriod)} className="bg-card border border-border p-1 rounded-xl">
          <ToggleGroupItem value="thisweek" className="rounded-lg px-4 h-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">This Week</ToggleGroupItem>
          <ToggleGroupItem value="thismonth" className="rounded-lg px-4 h-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">This Month</ToggleGroupItem>
          <ToggleGroupItem value="alltime" className="rounded-lg px-4 h-10 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">All Time</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="max-w-3xl mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className={`h-20 rounded-xl ${i <= 3 ? 'h-24' : ''}`} />
            ))}
          </div>
        ) : !leaderboard || leaderboard.length === 0 ? (
          <Card className="border-dashed bg-transparent border-border shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-muted p-4 rounded-full mb-4">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold font-serif mb-2">No runs logged yet</h3>
              <p className="text-muted-foreground">
                Be the first to claim a spot on the leaderboard for this period!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Top 3 get special treatment */}
            <div className="grid gap-3 mb-6">
              {leaderboard.slice(0, 3).map((entry, idx) => (
                <Card key={entry.userId || idx} className={cn(
                  "overflow-hidden border-2 transition-transform hover:scale-[1.02]",
                  idx === 0 ? "border-[#FFD700] bg-gradient-to-r from-[#FFD700]/10 to-background shadow-md shadow-[#FFD700]/10" :
                  idx === 1 ? "border-[#C0C0C0] bg-gradient-to-r from-[#C0C0C0]/10 to-background" :
                  "border-[#CD7F32] bg-gradient-to-r from-[#CD7F32]/10 to-background"
                )}>
                  <CardContent className="p-4 md:p-6 flex items-center gap-4 md:gap-6">
                    <div className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-full font-bold text-xl",
                      idx === 0 ? "bg-[#FFD700] text-amber-950" :
                      idx === 1 ? "bg-[#C0C0C0] text-gray-900" :
                      "bg-[#CD7F32] text-amber-950"
                    )}>
                      {idx === 0 ? <Medal className="w-6 h-6" /> : entry.rank}
                    </div>
                    
                    <Avatar className="w-14 h-14 border-2 border-background shadow-sm">
                      <AvatarImage src={entry.profileImageUrl || undefined} />
                      <AvatarFallback className="font-bold text-lg">{entry.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold font-serif truncate">{entry.displayName}</h3>
                      <p className="text-sm text-muted-foreground">{entry.runCount} runs</p>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl md:text-3xl font-black font-serif leading-none tracking-tight text-foreground">{entry.totalMiles.toFixed(1)}</div>
                      <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">miles</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Rest of leaderboard */}
            {leaderboard.slice(3).map((entry) => (
              <Card key={entry.userId || entry.rank} className="shadow-none hover:bg-muted/30 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold text-muted-foreground">
                    {entry.rank}
                  </div>
                  
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={entry.profileImageUrl || undefined} />
                    <AvatarFallback>{entry.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold font-serif truncate">{entry.displayName}</h3>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xl font-bold font-serif">{entry.totalMiles.toFixed(1)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
