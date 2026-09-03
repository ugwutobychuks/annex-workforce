import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SearchIcon, UserIcon, MapPinIcon, ShieldCheckIcon } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce.ts";

export default function TalentPool() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch] = useDebounce(searchInput, 400);

  const result = useQuery(api.employer.searchTalentPool, {
    search: debouncedSearch || undefined,
    paginationOpts: { numItems: 50, cursor: null },
  });

  const talents = result?.page ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Talent Pool</h2>
        <p className="text-muted-foreground mt-1">
          Discover verified candidates available for hire.
        </p>
      </div>

      <div className="relative max-w-md">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, skill, or headline..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      {result === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : talents.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border rounded-xl border-dashed">
          <UserIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No candidates found</p>
          <p className="text-sm mt-1">
            {searchInput ? "Try a different search term." : "No candidates have registered yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {talents.map(({ user, profile }: { user: any; profile: any }) => (
            <Card key={user._id} className="hover:border-primary/40 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <UserIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <CardTitle className="text-sm truncate">{user.name ?? "Anonymous"}</CardTitle>
                      {profile?.isVerified && (
                        <ShieldCheckIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {profile?.headline ?? "No headline"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {profile?.location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPinIcon className="w-3 h-3" /> {profile.location}
                  </div>
                )}
                {profile && profile.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.slice(0, 4).map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                    {profile.skills.length > 4 && (
                      <Badge variant="secondary" className="text-xs">+{profile.skills.length - 4}</Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No skills listed</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
