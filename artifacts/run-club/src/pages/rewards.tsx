import { 
  useListRewardTiers, 
  useListMyRedemptions, 
  useRequestRedemption, 
  useGetMyProfile,
  getListRewardTiersQueryKey, 
  getListMyRedemptionsQueryKey,
  getGetMyProfileQueryKey,
  getGetDashboardSummaryQueryKey
} from "@workspace/api-client-react";
import { Coffee, Gift, Check, Clock, AlertCircle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Rewards() {
  const queryClient = useQueryClient();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const defaultTab = params.get("tab") === "history" ? "history" : "available";
  
  const { data: profile, isLoading: profileLoading } = useGetMyProfile({
    query: { queryKey: getGetMyProfileQueryKey() }
  });
  
  const { data: rewardTiers, isLoading: tiersLoading } = useListRewardTiers({
    query: { queryKey: getListRewardTiersQueryKey() }
  });
  
  const { data: redemptions, isLoading: redemptionsLoading } = useListMyRedemptions({
    query: { queryKey: getListMyRedemptionsQueryKey() }
  });

  const requestMutation = useRequestRedemption();

  const handleRedeem = (tierId: number, tierName: string) => {
    requestMutation.mutate(
      { data: { rewardTierId: tierId } },
      {
        onSuccess: () => {
          toast.success("Redemption Requested!", {
            description: `Show this to the barista to claim your ${tierName}.`
          });
          queryClient.invalidateQueries({ queryKey: getListMyRedemptionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
        onError: (error) => {
          toast.error("Redemption failed", {
            description: (error as any).error || "Please try again later."
          });
        }
      }
    );
  };

  const isLoading = profileLoading || tiersLoading || redemptionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const activeTiers = rewardTiers?.filter(t => t.active) || [];
  const totalMiles = profile?.totalMiles || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold font-serif tracking-tight flex items-center gap-3">
            <Gift className="w-8 h-8 text-primary" /> Rewards
          </h1>
          <p className="text-muted-foreground mt-2">Unlock café perks with your miles.</p>
        </div>
        <div className="bg-card px-4 py-2 rounded-xl border border-border shadow-sm flex items-center gap-2">
          <span className="text-muted-foreground font-medium text-sm">Your Balance:</span>
          <span className="text-xl font-bold font-serif">{totalMiles.toFixed(1)} mi</span>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="mb-6 w-full max-w-md grid grid-cols-2 h-12">
          <TabsTrigger value="available" className="text-base rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">Available Rewards</TabsTrigger>
          <TabsTrigger value="history" className="text-base rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">My Redemptions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="available" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTiers.map((tier) => {
              const isUnlocked = totalMiles >= tier.milesRequired;
              const hasRedeemed = redemptions?.some(r => r.rewardTierId === tier.id);
              const isPending = redemptions?.some(r => r.rewardTierId === tier.id && r.status === 'pending');
              const isApproved = redemptions?.some(r => r.rewardTierId === tier.id && r.status === 'approved');
              
              let statusText = "Locked";
              let StatusIcon = AlertCircle;
              if (isPending) {
                statusText = "Pending Approval";
                StatusIcon = Clock;
              } else if (isApproved) {
                statusText = "Redeemed";
                StatusIcon = Check;
              } else if (hasRedeemed) {
                statusText = "Claimed";
                StatusIcon = Check;
              } else if (isUnlocked) {
                statusText = "Unlocked";
                StatusIcon = Coffee;
              }

              return (
                <Card 
                  key={tier.id} 
                  className={`border-2 transition-all duration-300 ${
                    isUnlocked && !hasRedeemed 
                      ? "border-primary/50 shadow-md hover:border-primary hover-elevate bg-card" 
                      : "border-border/50 bg-muted/20 opacity-80"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="bg-background rounded-full px-3 py-1 text-sm font-bold border border-border shadow-sm">
                        {tier.milesRequired} mi
                      </div>
                      <Badge variant={isUnlocked && !hasRedeemed ? "default" : "secondary"} className="gap-1 rounded-full">
                        <StatusIcon className="w-3 h-3" /> {statusText}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl mt-4 font-serif">{tier.name}</CardTitle>
                    <CardDescription className="text-base">{tier.description}</CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-2">
                    {isUnlocked && !hasRedeemed ? (
                      <Button 
                        className="w-full rounded-full" 
                        onClick={() => handleRedeem(tier.id, tier.name)}
                        disabled={requestMutation.isPending}
                      >
                        {requestMutation.isPending && requestMutation.variables?.data.rewardTierId === tier.id ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                        ) : (
                          <>Redeem Now</>
                        )}
                      </Button>
                    ) : (
                      <div className="w-full bg-background rounded-full py-2 px-4 text-center text-sm text-muted-foreground border border-border">
                        {!isUnlocked ? `${(tier.milesRequired - totalMiles).toFixed(1)} miles to go` : "Reward claimed"}
                      </div>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history">
          {(!redemptions || redemptions.length === 0) ? (
            <Card className="border-dashed bg-transparent border-border shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <Gift className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">No redemptions yet</h3>
                <p className="text-muted-foreground text-sm">
                  Once you redeem a reward, it will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {redemptions.map((redemption) => (
                <Card key={redemption.id} className="shadow-sm">
                  <CardContent className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg font-serif">{redemption.rewardTierName || "Unknown Reward"}</h3>
                      <p className="text-sm text-muted-foreground">Requested on {new Date(redemption.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {redemption.status === 'pending' && <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>}
                      {redemption.status === 'approved' && <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"><Check className="w-3 h-3 mr-1"/> Approved</Badge>}
                      {redemption.status === 'rejected' && <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1"/> Rejected</Badge>}
                      
                      {redemption.adminNotes && (
                        <p className="text-sm italic text-muted-foreground max-w-[200px] truncate">
                          "{redemption.adminNotes}"
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
