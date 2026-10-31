import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Header, { type NavView } from '@/components/Header';
import HomePage from '@/components/HomePage';
import QuickViewModal from '@/components/QuickViewModal';
import MovieDetails from '@/components/MovieDetails';
import SettingsView from '@/components/SettingsView';
import GenresView from '@/components/GenresView';
import CategoryView from '@/components/CategoryView';
import PlaybackToast from '@/components/PlaybackToast';
import LibraryView from '@/components/LibraryView';
import OrganizeView from '@/components/OrganizeView';
import OperationLogView from '@/components/OperationLogView';
import MetadataReviewView from '@/components/MetadataReviewView';
import AIAssistantView from '@/components/AIAssistantView';
import ToolsView from '@/components/ToolsView';
import { getMovieById, pickRandom } from '@/lib/movieUtils';
import { buildLibraryMovieEntries, type LibraryMovieEntry } from '@/lib/libraryMovieAdapter';
import { getLibraryService } from '@/services/LibraryService';
import { getMetadataService } from '@/services/metadata/MetadataService';
import { subscribeToLibraryUpdates } from '@/services/libraryEvents';
import { getPlaybackService, type PlayOutcome } from '@/services/playback/PlaybackService';
import type { Movie } from '@/types/movie';
import type { MediaItem } from '@/types/media-library';
import type { MovieMetadata } from '@/types/metadata';

export default function App() {
  const [activeView, setActiveView] = useState<NavView>('home');
  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [organizeFolderId, setOrganizeFolderId] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [reviewItem, setReviewItem] = useState<MediaItem | null>(null);
  const [reviewMetadata, setReviewMetadata] = useState<MovieMetadata | null>(null);
  const [playOutcome, setPlayOutcome] = useState<PlayOutcome | null>(null);
  const [playLoading, setPlayLoading] = useState(false);
  const [playingTitle, setPlayingTitle] = useState('');
  const [libraryEntries, setLibraryEntries] = useState<LibraryMovieEntry[]>([]);
  const enrichmentInFlight = useRef(new Set<string>());

  useEffect(() => {
    const savedTheme = localStorage.getItem('film-baz:theme');
    document.documentElement.dataset.theme =
      savedTheme === 'gold' || savedTheme === 'neon' ? savedTheme : 'dark';
  }, []);

  const loadLibrary = useCallback(async () => {
    const library = getLibraryService();
    const metadata = getMetadataService();
    await Promise.all([library.load(), metadata.load()]);
    setLibraryEntries(buildLibraryMovieEntries(library.getItems(), metadata));
  }, []);

  useEffect(() => {
    void loadLibrary();
    return subscribeToLibraryUpdates(() => { void loadLibrary(); });
  }, [loadLibrary]);

  const libraryMovies = useMemo(() => libraryEntries.map((entry) => entry.movie), [libraryEntries]);
  const featured = useMemo<Movie[]>(() => pickRandom(
    libraryEntries.filter((entry) => Boolean(entry.metadata?.posterUrl || entry.metadata?.backdropUrl)).map((entry) => entry.movie),
    3,
  ), [libraryEntries]);

  const quickViewMovie = quickViewId ? getMovieById(libraryMovies, quickViewId) : null;
  const detailsMovie = detailsId ? getMovieById(libraryMovies, detailsId) : null;

  const openQuickView = useCallback((id: string) => {
    if (!id) return;
    setQuickViewId(id);

    const library = getLibraryService();
    const metadataService = getMetadataService();
    const item = library.getItems().find((entry) => entry.id === id);
    if (!item || enrichmentInFlight.current.has(id)) return;

    const metadata = metadataService.getMetadataForItem(id);
    if (metadata?.manuallyCorrected) return;
    const needsEnrichment = !metadata
      || !(metadata.rating > 0)
      || !metadata.overview
      || !metadata.director;
    if (!needsEnrichment) return;

    enrichmentInFlight.current.add(id);
    void metadataService.enrichItem(item)
      .then(() => {
        setLibraryEntries(buildLibraryMovieEntries(library.getItems(), metadataService));
      })
      .catch(() => {
        // The quick view remains usable with cached/local information if providers fail.
      })
      .finally(() => {
        enrichmentInFlight.current.delete(id);
      });
  }, []);

  const closeQuickView = useCallback(() => setQuickViewId(null), []);

  const openDetails = useCallback((id: string) => {
    setQuickViewId(null);
    setDetailsId(id);
  }, []);

  const handlePlay = useCallback((id: string) => {
    const movie = getMovieById(libraryMovies, id);
    if (!movie) return;
    setPlayingTitle(movie.title);
    setPlayOutcome(null);
    setPlayLoading(true);
    getPlaybackService()
      .play(movie)
      .then((outcome) => {
        setPlayOutcome(outcome);
        setPlayLoading(false);
      })
      .catch(() => {
        setPlayOutcome({ success: false, browserMode: false, error: 'خطای غیرمنتظره در پخش.' });
        setPlayLoading(false);
      });
  }, [libraryMovies]);

  const navigate = useCallback((view: NavView) => {
    setDetailsId(null);
    setOrganizeFolderId(null);
    setShowLog(false);
    setReviewItem(null);
    setReviewMetadata(null);
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-base">
      <Header activeView={activeView} onNavigate={navigate} onOpenMovie={openQuickView} movies={libraryMovies} />

      <main>
        {detailsMovie ? (
          <MovieDetails
            movie={detailsMovie}
            onBack={() => {
              setDetailsId(null);
              window.scrollTo({ top: 0 });
            }}
            onPlay={handlePlay}
          />
        ) : activeView === 'home' ? (
          <HomePage
            entries={libraryEntries}
            featured={featured}
            onOpenDetails={openDetails}
            onQuickView={openQuickView}
          />
        ) : activeView === 'movies' ? (
          <CategoryView
            category="movie"
            title="فیلم‌ها"
            subtitle="مجموعه فیلم‌های کتابخانه شما"
            onOpenMovie={openQuickView}
            movies={libraryMovies}
          />
        ) : activeView === 'series' ? (
          <CategoryView
            category="series"
            title="سریال‌ها"
            subtitle="مجموعه سریال‌های کتابخانه شما"
            onOpenMovie={openQuickView}
            movies={libraryMovies}
          />
        ) : activeView === 'kids' ? (
          <CategoryView
            category="kids"
            title="کودک"
            subtitle="محتوای مناسب کودکان"
            onOpenMovie={openQuickView}
            movies={libraryMovies}
          />
        ) : activeView === 'genres' ? (
          <GenresView movies={libraryMovies} onOpenMovie={openQuickView} />
        ) : activeView === 'library' && reviewItem && reviewMetadata ? (
          <MetadataReviewView
            item={reviewItem}
            metadata={reviewMetadata}
            onBack={() => { setReviewItem(null); setReviewMetadata(null); }}
            onSaved={() => { setReviewItem(null); setReviewMetadata(null); }}
          />
        ) : activeView === 'library' && !organizeFolderId && !showLog ? (
          <LibraryView
            onBack={() => navigate('home')}
            onOrganize={(fid) => setOrganizeFolderId(fid)}
            onViewLog={() => setShowLog(true)}
            onReviewMetadata={(item, metadata) => { setReviewItem(item); setReviewMetadata(metadata); }}
          />
        ) : activeView === 'library' && organizeFolderId && !showLog ? (
          <OrganizeView
            folderId={organizeFolderId}
            onBack={() => setOrganizeFolderId(null)}
            onViewLog={() => setShowLog(true)}
          />
        ) : activeView === 'library' && showLog ? (
          <OperationLogView onBack={() => setShowLog(false)} />
        ) : activeView === 'assistant' ? (
          <AIAssistantView movies={libraryMovies} />
        ) : activeView === 'tools' ? (
          <ToolsView />
        ) : activeView === 'settings' ? (
          <SettingsView onBack={() => navigate('home')} onNavigateLibrary={() => navigate('library')} />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-text-muted">
        <p>فیلم باز — آرشیو فیلم و سریال شما</p>
      </footer>

      {/* Quick view modal */}
      {quickViewMovie && (
        <QuickViewModal
          movie={quickViewMovie}
          onClose={closeQuickView}
          onPlay={handlePlay}
          onOpenDetails={openDetails}
        />
      )}

      {/* Playback result toast */}
      {(playLoading || playOutcome) && (
        <PlaybackToast
          outcome={playOutcome}
          loading={playLoading}
          movieTitle={playingTitle}
          onClose={() => { setPlayOutcome(null); setPlayLoading(false); }}
        />
      )}
    </div>
  );
}
