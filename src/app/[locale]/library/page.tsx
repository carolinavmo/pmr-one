import { auth } from "@/auth";
import { getLibraryBrowseData, getTopicOfWeek, greetForHour } from "@/lib/library-home";
import { isLibrarySort } from "@/lib/library-sort";
import { getYourProgressData, getContinueReadingData } from "@/lib/library-progress";
import { getLibraryPrefs } from "@/lib/actions/library";
import { isDiseasePageType } from "@/lib/disease-page-type";
import { LibraryHero } from "@/components/library/LibraryHero";
import { YourProgress } from "@/components/library/YourProgress";
import { ContinueReading } from "@/components/library/ContinueReading";
import { TopicOfWeekFeatureView } from "@/components/library/TopicOfWeekFeature";
import { BrowseByArea } from "@/components/library/BrowseByArea";

interface LibraryPageProps {
  searchParams: Promise<{ area?: string; region?: string; type?: string; sort?: string; hideRead?: string }>;
}

// Pass 4 (design/LIBRARY-HOME-MIX-SPEC.md) — remembers the last tab/
// region/sort/hide-read per user, NEW/UPDATED tags, sorting, and the
// perf pass (getLibraryForest is now cross-request cached — see
// library-home.ts).
export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = await searchParams;
  const session = await auth();
  const canReview = session?.user.role === "editor" || session?.user.role === "admin";
  const userId = session?.user.id;

  // Explicit URL params win (a tab/region click always reflects
  // immediately); with none given, fall back to this user's saved
  // prefs; with neither, the defaults getLibraryBrowseData already
  // applies (MSK › Spine, reading order, hide read off).
  const savedPrefs = userId && !params.area && !params.region ? await getLibraryPrefs(userId) : null;
  const area = params.area ?? savedPrefs?.area ?? undefined;
  const region = params.region ?? savedPrefs?.region ?? undefined;
  const sort = isLibrarySort(params.sort) ? params.sort : (savedPrefs?.sort ?? undefined);
  const hideRead = params.hideRead ? params.hideRead === "1" : (savedPrefs?.hideRead ?? undefined);

  const [browseData, progressData, continueReading, topicOfWeek] = await Promise.all([
    getLibraryBrowseData({
      includeUnpublished: canReview,
      area,
      region,
      type: isDiseasePageType(params.type) ? params.type : undefined,
      userId,
      sort,
      hideRead,
    }),
    userId ? getYourProgressData(userId, canReview) : null,
    userId ? getContinueReadingData(userId) : Promise.resolve([]),
    getTopicOfWeek({ includeUnpublished: canReview, userId }),
  ]);

  // "First visit" only means something for a signed-in reader with no
  // reading history at all — a signed-out visitor still gets the
  // plain time-of-day greeting Pass 1 already built, never "Welcome"
  // (there's no account to welcome back).
  const isFirstVisit = Boolean(userId) && !progressData?.hasHistory;
  const greeting = greetForHour(new Date().getHours(), session?.user.name, isFirstVisit);

  return (
    <main className="flex flex-col pb-16">
      <LibraryHero greeting={greeting} typeChips={browseData.typeChips} />
      {progressData && <YourProgress data={progressData} />}
      <ContinueReading items={continueReading} />
      {topicOfWeek && <TopicOfWeekFeatureView feature={topicOfWeek} />}
      <BrowseByArea data={browseData} canPersist={Boolean(userId)} />
    </main>
  );
}
