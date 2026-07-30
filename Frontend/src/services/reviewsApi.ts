import { apiClient } from '../lib/api';

export interface DestinationReview {
  id: string;
  userId: string;
  canonicalId: string;
  rating: number;
  reviewText: string;
  sentimentLabel: string;
  sentimentScore: number;
  createdAt: string;
  user?: {
    fullName: string;
  };
}

export interface ReviewSummary {
  reviews: DestinationReview[];
  summary: {
    total: number;
    averageRating: number;
    sentiments: {
      positive: number;
      negative: number;
      neutral: number;
    };
  };
}

export const fetchDestinationReviews = async (canonicalId: string): Promise<ReviewSummary> => {
  try {
    const res = await apiClient.get(`/reviews/${canonicalId}`);
    return (
      res.data || {
        reviews: [],
        summary: {
          total: 0,
          averageRating: 0,
          sentiments: { positive: 0, negative: 0, neutral: 0 },
        },
      }
    );
  } catch (error) {
    return {
      reviews: [],
      summary: {
        total: 0,
        averageRating: 0,
        sentiments: { positive: 0, negative: 0, neutral: 0 },
      },
    };
  }
};

export const createDestinationReview = async (
  canonicalId: string,
  rating: number,
  reviewText: string,
): Promise<DestinationReview | null> => {
  try {
    const res = await apiClient.post('/reviews', {
      canonicalId,
      rating,
      reviewText,
    });
    return res.data?.data || null;
  } catch (error) {
    throw error;
  }
};
