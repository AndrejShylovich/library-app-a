import { baseApi } from "@/shared/api/baseApi";

import type {
  FetchUserDto,
  LoginUserDto,
  RegisterUserDto,
  UserDto,
} from "../model/dto/UserDto";

import { clearAuthData, saveAuthData } from "@/shared/lib/auth/authStorage";

type LoginResponse = {
  user: UserDto;
  token: string;
};

type UserResponse = {
  user: UserDto;
};

const AUTH_ENDPOINT = "/auth";
const USERS_ENDPOINT = "/users";

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    loginUser: builder.mutation<UserDto, LoginUserDto>({
      async queryFn(payload, _api, _extraOptions, baseQuery) {
        const result = await baseQuery({
          url: `${AUTH_ENDPOINT}/login`,
          method: "POST",
          data: payload,
        });
        if ("error" in result) {
          return { error: result.error };
        }

        const data = result.data as LoginResponse;

        saveAuthData(data.user._id, data.token);

        return { data: data.user };
      },

      invalidatesTags: ["User"],
    }),
    logoutUser: builder.mutation<void, void>({
      queryFn: async () => {
        clearAuthData();

        return {
          data: undefined,
        };
      },

      invalidatesTags: ["User"],
    }),
    registerUser: builder.mutation<void, RegisterUserDto>({
      async queryFn(payload, _api, _extraOptions, baseQuery) {
        const result = await baseQuery({
          url: `${AUTH_ENDPOINT}/register`,
          method: "POST",
          data: payload,
        });

        if ("error" in result) {
          return { error: result.error };
        }

        return { data: undefined };
      },

      invalidatesTags: ["User"],
    }),

    fetchUser: builder.query<
      { user: UserDto; property: FetchUserDto["property"] },
      FetchUserDto
    >({
      async queryFn(payload, _api, _extraOptions, baseQuery) {
        const result = await baseQuery({
          url: `${USERS_ENDPOINT}/${payload.userId}`,
        });
        if ("error" in result) {
          return { error: result.error };
        }

        const data = result.data as UserResponse;
        return {
          data: {
            user: data.user,
            property: payload.property,
          },
        };
      },

      providesTags: ["User"],
    }),

    updateUser: builder.mutation<UserDto, UserDto>({
      async queryFn(user, _api, _extraOptions, baseQuery) {
        const result = await baseQuery({
          url: USERS_ENDPOINT,
          method: "PUT",
          data: user,
        });

        if ("error" in result) {
          return { error: result.error };
        }

        const data = result.data as UserResponse;

        return {
          data: data.user,
        };
      },

      invalidatesTags: ["User"],
    }),
    getMe: builder.query<UserDto, void>({
      query: () => ({
        url: "/auth/me",
      }),

      transformResponse: (response: { user: UserDto }) => response.user,
      providesTags: ["User"],
    }),
  }),
});

export const {
  useLoginUserMutation,
  useRegisterUserMutation,
  useFetchUserQuery,
  useLazyFetchUserQuery,
  useUpdateUserMutation,
  useGetMeQuery,
  useLogoutUserMutation,
} = userApi;
