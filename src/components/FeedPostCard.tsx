
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  ImageList,
  ImageListItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import client from "../api/client";

export type FeedPost = {
  id: number;
  description: string;
  issuedAt: string;
  author: { id: number; fname: string; lname: string; imgUrl?: string };
  team: { id: number; name: string };
  media: Array<{ id: number; url: string; type: string; description?: string }>;
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
                sx={{
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
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
        subheader={
          post.issuedAt ? new Date(post.issuedAt).toLocaleString() : ""
        }
      />

      <CardContent sx={{ pt: 0 }}>
        <Typography sx={{ whiteSpace: "pre-wrap" }}>
          {post.description}
        </Typography>
        {Array.isArray(post.media) && post.media.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <ImageList
              variant="quilted"
              cols={post.media.length > 1 ? 2 : 1} // 2 columns if multiple images
              gap={8}
            >
              {post.media.map((item, index) => (
                <ImageListItem key={item.id || index}>
                  <Box
                    component="img"
                    src={item.url}
                    alt="post media"
                    loading="lazy"
                    sx={{
                      width: "100%",
                      height: post.media.length > 1 ? 200 : "auto", // fixed height for grid
                      maxHeight: 360,
                      objectFit: "cover",
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                </ImageListItem>
              ))}
            </ImageList>
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
                placeholder={
                  canComment ? "Write a comment..." : "Login to comment"
                }
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

export default FeedPostCard; 