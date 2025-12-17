import React, { useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
  ImageListItem,
  ImageList
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import FeedPostCard ,{type FeedPost} from '../../components/FeedPostCard'



export default function Feed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [expandedComments, setExpandedComments] = useState<
    Record<number, boolean>
  >({});
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>(
    {}
  );
  const [commentErrors, setCommentErrors] = useState<Record<number, string>>(
    {}
  );

  const {
    data: feedPosts,
    isLoading,
    error,
  } = useQuery<FeedPost[]>({
    queryKey: ["feedPosts"],
    queryFn: async () => {
      const res = await client.get("/posts/feed");
      return Array.isArray(res.data?.posts) ? res.data.posts : [];
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({
      postId,
      content,
    }: {
      postId: number;
      content: string;
    }) => {
      await client.post("/comments", { postId, content });
    },
    onSuccess: (_data, variables) => {
      setCommentDrafts((prev) => ({ ...prev, [variables.postId]: "" }));
      queryClient.invalidateQueries({
        queryKey: ["postComments", variables.postId],
      });
      queryClient.invalidateQueries({ queryKey: ["feedPosts"] });
    },
    onError: (e: any, variables) => {
      setCommentErrors((prev) => ({
        ...prev,
        [variables.postId]: e?.response?.data?.error || "Failed to add comment",
      }));
    },
  });

  const canComment = !!user;

  return (
    <Box sx={{ width: "100%" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems="center"
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Home Feed
          </Typography>
          <Typography color="text.secondary">
            Posts from teams you subscribe to.
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ mt: 3 }}>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">Failed to load feed.</Alert>
        ) : (feedPosts || []).length === 0 ? (
          <Paper sx={{ p: 3 }}>
            <Typography color="text.secondary">
              No posts yet. Subscribe to teams and check back.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {(feedPosts || []).map((post) => {
              const isOpen = !!expandedComments[post.id];
              return (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  isOpen={isOpen}
                  onToggle={() =>
                    setExpandedComments((prev) => ({
                      ...prev,
                      [post.id]: !prev[post.id],
                    }))
                  }
                  commentDraft={commentDrafts[post.id] || ""}
                  setCommentDraft={(value) =>
                    setCommentDrafts((prev) => ({
                      ...prev,
                      [post.id]: value,
                    }))
                  }
                  commentError={commentErrors[post.id]}
                  clearCommentError={() =>
                    setCommentErrors((prev) => ({ ...prev, [post.id]: "" }))
                  }
                  canComment={canComment && !addCommentMutation.isPending}
                  onSubmitComment={(content) => {
                    if (!content) {
                      setCommentErrors((prev) => ({
                        ...prev,
                        [post.id]: "Comment can't be empty",
                      }));
                      return;
                    }
                    addCommentMutation.mutate({ postId: post.id, content });
                  }}
                />
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
