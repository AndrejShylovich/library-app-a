import { baseApi } from "@/shared/api/baseApi";

import type {
  BookDto,
  BookPageResult,
  CheckinBookDto,
  CheckoutBookDto,
} from "../model/dto/BookDto";

import type { LoanRecordDto } from "@/entities/loan-record/model/dto/LoanRecordDto";

import { createCheckoutRecord } from "../model/lib/createCheckoutRecord";

import { createCheckinRecord } from "../model/lib/createCheckingRecord";

import { normalizeLoanRecord } from "../model/lib/normalizeLoanRecord";

type BookListResponse = {
  books: BookDto[];
};

type BookPageResponse = {
  page: BookPageResult;
};

type BarcodeSearchResponse = {
  page: {
    items: BookDto[];
  };
};

type CardResponse = {
  libraryCard: {
    user: {
      _id: string;
    };
  };
};

type LoanResponse = {
  record: LoanRecordDto;
};

const getError = (result: unknown) => {
  if ("error" in (result as object)) {
    return {
      error: (result as { error: unknown }).error,
    };
  }

  return null;
};

export const bookQueryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBooks: builder.query<BookDto[], void>({
      query: () => ({
        url: "/book",
      }),

      transformResponse: (response: BookListResponse) => response.books,

      providesTags: ["Book"],
    }),

    queryBooks: builder.query<BookPageResult, string>({
      query: (query) => ({
        url: `/book/query${query}`,
      }),

      transformResponse: (response: BookPageResponse) => response.page,

      providesTags: ["Book"],
    }),

    getBookByBarcode: builder.query<BookDto, string>({
      async queryFn(barcode, _api, _extraOptions, baseQuery) {
        const result = await baseQuery({
          url: "/book/query",
          params: {
            barcode,
          },
        });

        const error = getError(result);

        if (error) {
          return error;
        }

        const data = result.data as BarcodeSearchResponse;

        const [book] = data.page.items;

        if (!book) {
          return {
            error: {
              status: 404,
              data: `Book not found: ${barcode}`,
            },
          };
        }

        return {
          data: book,
        };
      },

      providesTags: (_result, _error, barcode) => [
        {
          type: "Book",
          id: barcode,
        },
      ],
    }),

    checkoutBook: builder.mutation<LoanRecordDto, CheckoutBookDto>({
      async queryFn(payload, _api, _extraOptions, baseQuery) {
        const cardResult = await baseQuery({
          url: `/card/${payload.libraryCard}`,
        });

        const cardError = getError(cardResult);

        if (cardError) {
          return cardError;
        }

        const {
          libraryCard: {
            user: { _id: patronId },
          },
        } = cardResult.data as CardResponse;

        const loanResult = await baseQuery({
          url: "/loan",
          method: "POST",
          data: createCheckoutRecord(payload, patronId),
        });

        const loanError = getError(loanResult);

        if (loanError) {
          return loanError;
        }

        return {
          data: normalizeLoanRecord((loanResult.data as LoanResponse).record),
        };
      },

      invalidatesTags: ["Book"],
    }),

    checkinBook: builder.mutation<LoanRecordDto, CheckinBookDto>({
      async queryFn(payload, _api, _extraOptions, baseQuery) {
        const result = await baseQuery({
          url: "/loan",
          method: "PUT",
          data: createCheckinRecord(payload),
        });

        const error = getError(result);

        if (error) {
          return error;
        }

        return {
          data: normalizeLoanRecord((result.data as LoanResponse).record),
        };
      },

      invalidatesTags: ["Book"],
    }),
  }),
});

export const {
  useGetBooksQuery,
  useQueryBooksQuery,
  useGetBookByBarcodeQuery,
  useCheckoutBookMutation,
  useCheckinBookMutation,
} = bookQueryApi;
