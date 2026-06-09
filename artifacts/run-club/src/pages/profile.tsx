import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMyProfile,
  useUpdateMyProfile,
  useListMyDependents,
  useAddDependent,
  useRemoveDependent,
  useListDependentRedemptions,
  useRequestRedemption,
  useListRewardTiers,
  useGetStravaStatus,
  useDisconnectStrava,
  useSyncStrava,
  getGetMyProfileQueryKey,
  getListMyDependentsQueryKey,
  getListRewardTiersQueryKey,
  getListDependentRedemptionsQueryKey,
  getListMyRedemptionsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetStravaStatusQueryKey,
  getListMyRunsQueryKey,
} from "@workspace/api-client-react";
import type { Member, RewardTier, Redemption } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  UserCircle, Phone, PhoneCall, Mail, Save, Loader2,
  Users, Plus, Trash2, Baby, Gift, Clock, Check, AlertCircle,
  ChevronDown, ChevronUp, Trophy, Activity, Link2, Link2Off, RefreshCw, Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const profileSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email").or(z.literal("")).optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

// ── Dependent reward card ────────────────────────────────────────────────────

function DependentRewardCard({
  dependent,
  tiers,
  onRemove,
}: {
  dependent: Member;
  tiers: RewardTier[];
  onRemove: () => void;
}) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: redemptions = [], isLoading: redemptionsLoading } = useListDependentRedemptions(
    dependent.id,
    { query: { queryKey: getListDependentRedemptionsQueryKey(dependent.id), enabled: expanded } }
  );

  const requestMutation = useRequestRedemption();

  const activeTiers = tiers.filter((t) => t.active).sort((a, b) => a.milesRequired - b.milesRequired);
  const totalMiles = dependent.totalMiles ?? 0;
  const nextTier = activeTiers.find((t) => totalMiles < t.milesRequired) ?? null;
  const milesUntilNext = nextTier ? nextTier.milesRequired - totalMiles : null;
  const progressPct = nextTier
    ? Math.min(100, Math.max(0, ((nextTier.milesRequired - (milesUntilNext ?? 0)) / nextTier.milesRequired) * 100))
    : 100;

  const unlockedTiers = activeTiers.filter((t) => totalMiles >= t.milesRequired);

  const handleRedeem = (tierId: number, tierName: string) => {
    requestMutation.mutate(
      { data: { rewardTierId: tierId, forUserId: dependent.userId } },
      {
        onSuccess: () => {
          toast.success(`Reward requested for ${dependent.displayName}!`, {
            description: `Show this to the barista to claim ${tierName}.`,
          });
          queryClient.invalidateQueries({
            queryKey: getListDependentRedemptionsQueryKey(dependent.id),
          });
          queryClient.invalidateQueries({ queryKey: getListMyDependentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListMyRedemptionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
        onError: (error) => {
          toast.error("Redemption failed", {
            description: (error as any).error || "Please try again later.",
          });
        },
      }
    );
  };

  const depInitials = dependent.displayName.substring(0, 2).toUpperCase();
  const pendingCount = (redemptions as Redemption[]).filter((r) => r.status === "pending").length;

  return (
    <Card className="rounded-2xl overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-secondary/20 text-secondary font-bold text-sm">
              {depInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold">{dependent.displayName}</p>
              {pendingCount > 0 && (
                <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                  {pendingCount} pending
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalMiles.toFixed(1)} miles
              {nextTier ? ` · ${milesUntilNext?.toFixed(1)} mi to ${nextTier.name}` : " · All tiers unlocked!"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove {dependent.displayName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove {dependent.displayName} and all their logged runs and redemptions. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onRemove}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remove
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-border/50 bg-muted/10">
          {/* Progress bar */}
          <div className="px-4 py-4 space-y-2">
            {nextTier ? (
              <>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{totalMiles.toFixed(1)} mi logged</span>
                  <span>Next: {nextTier.name} at {nextTier.milesRequired} mi</span>
                </div>
                <Progress value={progressPct} className="h-2" />
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-secondary font-medium">
                <Trophy className="w-4 h-4" /> All reward tiers unlocked!
              </div>
            )}
          </div>

          <Separator />

          {/* Unlocked rewards */}
          <div className="px-4 py-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Earned Rewards ({unlockedTiers.length})
            </p>
            {unlockedTiers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rewards unlocked yet — keep logging those miles!
              </p>
            ) : (
              <div className="space-y-2">
                {unlockedTiers.map((tier) => {
                  const tierRedemptions = (redemptions as Redemption[]).filter((r) => r.rewardTierId === tier.id);
                  const isPending = tierRedemptions.some((r) => r.status === "pending");
                  const isApproved = tierRedemptions.some((r) => r.status === "approved");
                  const hasAny = tierRedemptions.length > 0;

                  return (
                    <div
                      key={tier.id}
                      className="flex items-center justify-between bg-background rounded-xl px-3 py-2 border border-border/50"
                    >
                      <div>
                        <p className="font-medium text-sm">{tier.name}</p>
                        <p className="text-xs text-muted-foreground">{tier.milesRequired} mi</p>
                      </div>
                      {redemptionsLoading ? (
                        <Skeleton className="h-8 w-24 rounded-full" />
                      ) : isPending ? (
                        <Badge variant="outline" className="gap-1 bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 rounded-full">
                          <Clock className="w-3 h-3" /> Pending
                        </Badge>
                      ) : isApproved ? (
                        <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 rounded-full">
                          <Check className="w-3 h-3" /> Approved
                        </Badge>
                      ) : hasAny ? (
                        <Badge variant="outline" className="gap-1 rounded-full">
                          <Check className="w-3 h-3" /> Claimed
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full text-xs h-8"
                          onClick={() => handleRedeem(tier.id, tier.name)}
                          disabled={requestMutation.isPending}
                        >
                          {requestMutation.isPending && requestMutation.variables?.data.forUserId === dependent.userId && requestMutation.variables?.data.rewardTierId === tier.id ? (
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                          ) : (
                            <Gift className="w-3 h-3 mr-1" />
                          )}
                          Request
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Redemption history */}
          {!redemptionsLoading && (redemptions as Redemption[]).length > 0 && (
            <>
              <Separator />
              <div className="px-4 py-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Redemption History
                </p>
                <div className="space-y-2">
                  {(redemptions as Redemption[]).map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{r.rewardTierName ?? "Reward"}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                        {r.status === "pending" && (
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
                            <Clock className="w-2.5 h-2.5 mr-1" /> Pending
                          </Badge>
                        )}
                        {r.status === "approved" && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                            <Check className="w-2.5 h-2.5 mr-1" /> Approved
                          </Badge>
                        )}
                        {r.status === "rejected" && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="w-2.5 h-2.5 mr-1" /> Rejected
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Main profile page ────────────────────────────────────────────────────────

export default function Profile() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useGetMyProfile({
    query: { queryKey: getGetMyProfileQueryKey() },
  });
  const { data: dependents = [], isLoading: dependentsLoading } = useListMyDependents({
    query: { queryKey: getListMyDependentsQueryKey() },
  });
  const { data: rewardTiers = [] } = useListRewardTiers({
    query: { queryKey: getListRewardTiersQueryKey() },
  });
  const { data: stravaStatus, isLoading: stravaLoading } = useGetStravaStatus({
    query: { queryKey: getGetStravaStatusQueryKey() },
  });

  const updateProfile = useUpdateMyProfile();
  const addDependent = useAddDependent();
  const removeDependent = useRemoveDependent();
  const disconnectStrava = useDisconnectStrava();
  const syncStrava = useSyncStrava();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDependentName, setNewDependentName] = useState("");
  const [addingDependent, setAddingDependent] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncAfterDate, setSyncAfterDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      email: "",
      phone: "",
      emergencyContact: "",
      emergencyPhone: "",
    },
  });

  useEffect(() => {
    if (profile) {
      reset({
        displayName: profile.displayName ?? "",
        email: profile.email ?? "",
        phone: (profile as any).phone ?? "",
        emergencyContact: (profile as any).emergencyContact ?? "",
        emergencyPhone: (profile as any).emergencyPhone ?? "",
      });
    }
  }, [profile, reset]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stravaParam = params.get("strava");
    if (stravaParam === "connected") {
      toast.success("Strava connected!", { description: "You can now sync your runs from Strava." });
      queryClient.invalidateQueries({ queryKey: getGetStravaStatusQueryKey() });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (stravaParam === "error") {
      toast.error("Strava connection failed", { description: "Please try again." });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleDisconnectStrava = () => {
    disconnectStrava.mutate(undefined, {
      onSuccess: () => {
        toast.success("Strava disconnected");
        queryClient.invalidateQueries({ queryKey: getGetStravaStatusQueryKey() });
      },
      onError: () => toast.error("Failed to disconnect Strava"),
    });
  };

  const handleSyncStrava = () => {
    syncStrava.mutate(
      { data: { afterDate: syncAfterDate || undefined } },
      {
        onSuccess: (result) => {
          setSyncDialogOpen(false);
          if (result.imported === 0) {
            toast.info("No new runs to import", { description: "All your Strava runs are already synced." });
          } else {
            toast.success(`Imported ${result.imported} run${result.imported === 1 ? "" : "s"} from Strava!`);
          }
          queryClient.invalidateQueries({ queryKey: getListMyRunsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        },
        onError: (err) => {
          toast.error("Sync failed", { description: (err as any)?.error ?? "Please try again." });
        },
      }
    );
  };

  const onSubmit = async (values: ProfileForm) => {
    try {
      await updateProfile.mutateAsync({
        data: {
          displayName: values.displayName,
          email: values.email || null,
          phone: values.phone || null,
          emergencyContact: values.emergencyContact || null,
          emergencyPhone: values.emergencyPhone || null,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      toast.success("Profile saved!");
    } catch {
      toast.error("Failed to save profile. Please try again.");
    }
  };

  const handleAddDependent = async () => {
    if (!newDependentName.trim()) return;
    setAddingDependent(true);
    try {
      await addDependent.mutateAsync({ data: { displayName: newDependentName.trim() } });
      queryClient.invalidateQueries({ queryKey: getListMyDependentsQueryKey() });
      toast.success(`${newDependentName.trim()} added to your account!`);
      setNewDependentName("");
      setAddDialogOpen(false);
    } catch {
      toast.error("Failed to add family member. Please try again.");
    } finally {
      setAddingDependent(false);
    }
  };

  const handleRemoveDependent = async (dependentId: number, name: string) => {
    try {
      await removeDependent.mutateAsync({ dependentId });
      queryClient.invalidateQueries({ queryKey: getListMyDependentsQueryKey() });
      toast.success(`${name} removed from your account.`);
    } catch {
      toast.error("Failed to remove family member.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const initials = profile?.displayName?.substring(0, 2).toUpperCase() ?? "RC";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-xl">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold font-serif tracking-tight flex items-center gap-3">
          <UserCircle className="w-8 h-8 text-primary" /> My Profile
        </h1>
        <p className="text-muted-foreground mt-2">Update your contact details and emergency info.</p>
      </div>

      {/* Avatar row */}
      <div className="flex items-center gap-4">
        <Avatar className="w-16 h-16 text-lg">
          <AvatarImage src={profile?.profileImageUrl ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-lg">{profile?.displayName}</p>
          <p className="text-sm text-muted-foreground">
            {profile?.totalMiles ?? 0} miles logged · member since{" "}
            {profile?.joinedAt ? new Date(profile.joinedAt).getFullYear() : "–"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-primary" /> Basic Info
            </CardTitle>
            <CardDescription>Your name as it appears on the leaderboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" placeholder="Your name" {...register("displayName")} />
              {errors.displayName && (
                <p className="text-xs text-destructive">{errors.displayName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> Email
              </Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
              <p className="text-xs text-muted-foreground">Used for reward approval notifications.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Phone Number
              </Label>
              <Input id="phone" type="tel" placeholder="(555) 000-0000" {...register("phone")} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-amber-600" /> Emergency Contact
            </CardTitle>
            <CardDescription>Who should we call in case of an emergency during a run?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContact">Contact Name</Label>
              <Input id="emergencyContact" placeholder="Full name" {...register("emergencyContact")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergencyPhone">Contact Phone</Label>
              <Input id="emergencyPhone" type="tel" placeholder="(555) 000-0000" {...register("emergencyPhone")} />
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || isSubmitting} className="min-w-32">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-4 h-4 mr-2" /> Save Profile</>
            )}
          </Button>
        </div>
      </form>

      {/* Strava Integration */}
      <Separator />
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold font-serif flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#FC4C02]" /> Strava
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect Strava to import verified runs automatically.
          </p>
        </div>

        <Card className="rounded-2xl">
          <CardContent className="pt-6">
            {stravaLoading ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ) : stravaStatus?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FC4C02]/10 p-2.5 rounded-full">
                    <Activity className="w-5 h-5 text-[#FC4C02]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Connected as {stravaStatus.athleteName}</p>
                    <p className="text-xs text-muted-foreground">Strava account linked — runs you sync will be marked as verified.</p>
                  </div>
                  <Badge variant="outline" className="ml-auto text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 shrink-0">
                    <Check className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-2"
                    onClick={() => setSyncDialogOpen(true)}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Sync from Strava
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full gap-2 text-muted-foreground hover:text-destructive"
                    onClick={handleDisconnectStrava}
                    disabled={disconnectStrava.isPending}
                  >
                    {disconnectStrava.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link2Off className="w-3.5 h-3.5" />
                    )}
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-muted p-2.5 rounded-full">
                    <Link2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Not connected</p>
                    <p className="text-xs text-muted-foreground">Link your Strava account to sync verified runs.</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="rounded-full shrink-0 bg-[#FC4C02] hover:bg-[#FC4C02]/90 text-white"
                  onClick={() => { window.location.href = "/api/strava/connect"; }}
                >
                  <Activity className="w-3.5 h-3.5 mr-1.5" /> Connect Strava
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Strava sync dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-[#FC4C02]" /> Sync from Strava
            </DialogTitle>
            <DialogDescription>
              Import your Strava runs since the selected date. Already-synced runs won't be duplicated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="syncAfterDate" className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Import runs since
            </Label>
            <Input
              id="syncAfterDate"
              type="date"
              value={syncAfterDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setSyncAfterDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSyncStrava}
              disabled={syncStrava.isPending}
              className="bg-[#FC4C02] hover:bg-[#FC4C02]/90 text-white"
            >
              {syncStrava.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing…</>
              ) : (
                <><RefreshCw className="w-4 h-4 mr-2" /> Sync Runs</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Family Members */}
      <Separator />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-serif flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Family Members
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tap a member to see their reward progress and request redemptions.
            </p>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 rounded-full">
                <Plus className="w-4 h-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Baby className="w-5 h-5 text-primary" /> Add a Family Member
                </DialogTitle>
                <DialogDescription>
                  Enter their name. They'll appear on the leaderboard and earn rewards just like any member.
                  You'll log their runs and manage their rewards from here.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="dependentName">Name</Label>
                <Input
                  id="dependentName"
                  placeholder="e.g. Emma, Jake"
                  value={newDependentName}
                  onChange={(e) => setNewDependentName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddDependent();
                    }
                  }}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setAddDialogOpen(false);
                    setNewDependentName("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddDependent} disabled={!newDependentName.trim() || addingDependent}>
                  {addingDependent ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Add Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {dependentsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        ) : dependents.length === 0 ? (
          <Card className="rounded-2xl border-dashed bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <div className="bg-muted p-3 rounded-full mb-3">
                <Baby className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No family members yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Add kids or others who run with the club but don't have their own account.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {dependents.map((dep) => (
              <DependentRewardCard
                key={dep.id}
                dependent={dep}
                tiers={rewardTiers}
                onRemove={() => handleRemoveDependent(dep.id, dep.displayName)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
