export const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:5231/api';

export interface BaseResponse<T> {
  result: T;
  errorMessage: string | null;
  isSuccess: boolean;
}

export interface TranscodeStatus {
  percentageStatus: number;
  status: string; // "Processing" | "Completed" | "Failed" | "Pending or Not Found"
  errorMessage: string | null;
}

export interface SubtitleDto {
  id: string;
  language: string;
  label: string;
  filePath: string;
}

export interface CatalogItemDTO {
  id: string;
  title: string | null;
  type: string | null; // "Movie" or "Show"
  posterPath: string | null;
  dateAdded: string;
}

export interface MediaItemDto {
  id: string;
  title: string | null;
  dateAdded: string;
}

export interface MovieDto {
  id: string;
  title: string | null;
  description: string | null;
  posterPath: string | null;
  mediaItem: MediaItemDto;
}

export interface TvShowDto {
  id: string;
  title: string | null;
  description: string | null;
  posterPath: string | null;
  createdAt: string;
  episodes: MediaItemDto[] | null;
}

export const api = {
  getCatalog: async (): Promise<CatalogItemDTO[]> => {
    const res = await fetch(`${BASE_URL}/Catalog`);
    const data: BaseResponse<CatalogItemDTO[]> = await res.json();
    return data.isSuccess ? data.result : [];
  },
  listMedia: async (): Promise<MediaItemDto[]> => {
    const res = await fetch(`${BASE_URL}/Catalog/list-media`);
    const data: BaseResponse<MediaItemDto[]> = await res.json();
    return data.isSuccess ? data.result : [];
  },
  getMovie: async (id: string): Promise<MovieDto | null> => {
    const res = await fetch(`${BASE_URL}/Catalog/movie/${id}`);
    const data: BaseResponse<MovieDto> = await res.json();
    return data.isSuccess ? data.result : null;
  },
  getTvShow: async (id: string): Promise<TvShowDto | null> => {
    const res = await fetch(`${BASE_URL}/Catalog/tv-show/${id}`);
    const data: BaseResponse<TvShowDto> = await res.json();
    return data.isSuccess ? data.result : null;
  },
  getSubtitles: async (mediaId: string): Promise<SubtitleDto[]> => {
    const res = await fetch(`${BASE_URL}/Subtitles/${mediaId}`);
    const data: BaseResponse<SubtitleDto[]> = await res.json();
    return data.isSuccess ? data.result : [];
  },
  getTranscodeStatus: async (mediaId: string): Promise<TranscodeStatus | null> => {
    const res = await fetch(`${BASE_URL}/Streaming/hls/${mediaId}/progress`);
    const data: BaseResponse<TranscodeStatus> = await res.json();
    return data.isSuccess ? data.result : null;
  },
  uploadSubtitle: async (mediaId: string, file: File, language: string): Promise<boolean> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    const res = await fetch(`${BASE_URL}/Subtitles/${mediaId}/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return data.isSuccess;
  },
  createMovie: async (mediaItemId: string, title: string, description: string, posterPath: string): Promise<MovieDto | null> => {
    const res = await fetch(`${BASE_URL}/Catalog/create-movie`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaItemId, title, description, posterPath }),
    });
    const data: BaseResponse<MovieDto> = await res.json();
    return data.isSuccess ? data.result : null;
  },
  createTvShow: async (title: string, description: string, posterPath: string, episodes: string[]): Promise<TvShowDto | null> => {
    const res = await fetch(`${BASE_URL}/Catalog/create-tv-show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, posterPath, episodes }),
    });
    const data: BaseResponse<TvShowDto> = await res.json();
    return data.isSuccess ? data.result : null;
  },
  deleteMovie: async (id: string): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/Catalog/movie/${id}`, { method: 'DELETE' });
    const data: BaseResponse<boolean> = await res.json();
    return data.isSuccess;
  },
  deleteTvShow: async (id: string): Promise<boolean> => {
    const res = await fetch(`${BASE_URL}/Catalog/tv-show/${id}`, { method: 'DELETE' });
    const data: BaseResponse<boolean> = await res.json();
    return data.isSuccess;
  },
};
