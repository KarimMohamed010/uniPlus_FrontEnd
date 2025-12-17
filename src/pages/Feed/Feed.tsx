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
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import client from "../../api/client";
import { useAuth } from "../../context/AuthContext";

type FeedPost = {
  id: number;
  description: string;
  issuedAt: string;
  author: { id: number; fname: string; lname: string; imgUrl?: string };
  team: { id: number; name: string };
  media: Array<{ url: string; type: string; description?: string }>;
};

type CommentItem = {
  id: number;
  content: string;
  postId: number;
  author: number | null;
  issuedAt: string;
  parentId: number | null;
};

function FeedPostCard({
  post,
  isOpen,
  onToggle,
  commentDraft,
  setCommentDraft,
  commentError,
  clearCommentError,
  canComment,
  onSubmitComment,
}: {
  post: FeedPost;
  isOpen: boolean;
  onToggle: () => void;
  commentDraft: string;
  setCommentDraft: (value: string) => void;
  commentError?: string;
  clearCommentError: () => void;
  canComment: boolean;
  onSubmitComment: (content: string) => void;
}) {
  const navigate = useNavigate();
  const commentsQuery = useQuery<CommentItem[]>({
    queryKey: ["postComments", post.id],
    queryFn: async () => {
      const res = await client.get(`/comments/post/${post.id}`);
      return Array.isArray(res.data?.comments)
        ? (res.data.comments as CommentItem[])
        : [];
    },
    enabled: isOpen,
  });

  const postComments = commentsQuery.data || [];

  return (
    <Card key={post.id} variant="outlined">
      <CardHeader
        avatar={
          <Avatar src={post.author?.imgUrl}>
            {(post.author?.fname || "U").charAt(0)}
          </Avatar>
        }
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ fontWeight: 700 }}>
              <Box
                component="span"
                onClick={() => navigate(`/profile/${post.author?.id}`)}
                sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
              >
                {post.author?.fname} {post.author?.lname}
              </Box>
            </Typography>
            <Typography color="text.secondary">in</Typography>
            <Typography
              sx={{
                fontWeight: 700,
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
              onClick={() => navigate(`/teams/${post.team?.id}`)}
            >
              {post.team?.name}
            </Typography>
          </Stack>
        }
        subheader={post.issuedAt ? new Date(post.issuedAt).toLocaleString() : ""}
      />

      <CardContent sx={{ pt: 0 }}>
        <Typography sx={{ whiteSpace: "pre-wrap" }}>{post.description}</Typography>

        {Array.isArray(post.media) && post.media.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box
              component="img"
              src={post.media[0].url}
              alt="post media"
              sx={{
                width: "100%",
                maxHeight: 360,
                objectFit: "cover",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            />
          </Box>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button size="small" onClick={onToggle}>
            {isOpen ? "Hide comments" : "Show comments"}
          </Button>
        </Stack>

        {isOpen && (
          <Box sx={{ mt: 2 }}>
            {commentError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {commentError}
              </Alert>
            )}

            {commentsQuery.isLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={22} />
              </Box>
            ) : postComments.length === 0 ? (
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                No comments yet.
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ mb: 2 }}>
                {postComments.map((c) => (
                  <Paper key={c.id} variant="outlined" sx={{ p: 1.5 }}>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {c.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.issuedAt ? new Date(c.issuedAt).toLocaleString() : ""}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                fullWidth
                size="small"
                placeholder={canComment ? "Write a comment..." : "Login to comment"}
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                disabled={!canComment}
              />
              <Button
                variant="contained"
                onClick={() => {
                  clearCommentError();
                  const text = (commentDraft || "").trim();
                  if (!text) {
                    onSubmitComment("");
                    return;
                  }
                  onSubmitComment(text);
                }}
                disabled={!canComment}
              >
                Post
              </Button>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              Commenting requires you to be subscribed to the team.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [expandedComments, setExpandedComments] = useState<Record<number, boolean>>(
    {}
  );
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [commentErrors, setCommentErrors] = useState<Record<number, string>>({});

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
    mutationFn: async ({ postId, content }: { postId: number; content: string }) => {
      await client.post("/comments", { postId, content });
    },
    onSuccess: (_data, variables) => {
      setCommentDrafts((prev) => ({ ...prev, [variables.postId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["postComments", variables.postId] });
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
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
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
