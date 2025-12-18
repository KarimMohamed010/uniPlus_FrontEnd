import React from "react";
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from "@mui/material";
import { Report as ReportIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import client from "../api/client";

// --- Types ---

export type FeedPost = {
  id: number;
  description: string;
  issuedAt: string;
  author: { id: number; fname: string; lname: string; imgUrl?: string };
  team: { id: number; name: string };
  media: Array<{ id: number; url: string; type: string; description?: string }>;
  commentCount: number;
};

interface CommentAuthor {
  id: number;
  fname: string;
  lname: string;
  imgUrl?: string;
}

type CommentItem = {
  id: number;
  content: string;
  postId: number;
  author: number | null;
  authorDetails?: CommentAuthor;
  issuedAt: string;
  parentId: number | null;
};

type CommentNode = CommentItem & { children: CommentNode[] };

// --- Component ---

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
  const [reportDialogOpen, setReportDialogOpen] = React.useState(false);
  const [reportReason, setReportReason] = React.useState("");
  const [snackbar, setSnackbar] = React.useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) return;
    try {
      await client.post(`/posts/${post.id}/report`, {
        description: reportReason,
      });
      setSnackbar({
        open: true,
        message: "Post reported successfully",
        severity: "success",
      });
      setReportDialogOpen(false);
      setReportReason("");
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Failed to report post",
        severity: "error",
      });
    }
  };

  const queryClient = useQueryClient();

  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<number, boolean>>({});
  const [replyErrors, setReplyErrors] = useState<Record<number, string>>({});

  const commentsQuery = useQuery<CommentItem[]>({
    queryKey: ["postComments", post.id],
    queryFn: async () => {
      const res = await client.get(`/comments/post/${post.id}`);
      const rawComments = Array.isArray(res.data?.comments)
        ? (res.data.comments as CommentItem[])
        : [];

      const enrichedComments = await Promise.all(
        rawComments.map(async (c) => {
          if (!c.author) return c;
          try {
            const userRes = await client.get(`/users/id/${c.author}`);
            return { ...c, authorDetails: userRes.data.user };
          } catch (err) {
            console.error("Failed to fetch comment author", err);
            return c;
          }
        })
      );
      return enrichedComments;
    },
    enabled: isOpen,
  });

  const postComments = commentsQuery.data || [];
  const commentsCountToShow =
    typeof post.commentCount === "number" ? post.commentCount : postComments.length;

  const replyMutation = useMutation({
    mutationFn: async (payload: { content: string; parentId: number }) => {
      const res = await client.post(`/comments`, {
        postId: post.id,
        content: payload.content,
        parentId: payload.parentId,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postComments", post.id] });
    },
  });

  const nestedComments = useMemo(() => {
    const map = new Map<number, CommentNode>();
    const roots: CommentNode[] = [];
    postComments.forEach((c) => map.set(c.id, { ...c, children: [] }));
    map.forEach((node) => {
      if (node.parentId) {
        const parent = map.get(node.parentId);
        if (parent) parent.children.push(node);
        else roots.push(node);
      } else {
        roots.push(node);
      }
    });

    const sortRec = (arr: CommentNode[]) => {
      arr.sort(
        (a, b) =>
          new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      );
      arr.forEach((n) => sortRec(n.children));
    };
    sortRec(roots);
    return roots;
  }, [postComments]);

  const handleToggleReply = (id: number) => {
    setReplyOpen((p) => ({ ...p, [id]: !p[id] }));
    setReplyErrors((p) => ({ ...p, [id]: "" }));
  };

  const submitReply = (parentId: number) => {
    const text = (replyDrafts[parentId] || "").trim();
    if (!text) {
      setReplyErrors((p) => ({ ...p, [parentId]: "Reply cannot be empty" }));
      return;
    }
    replyMutation.mutate(
      { content: text, parentId },
      {
        onSuccess: () => {
          setReplyDrafts((p) => {
            const cp = { ...p };
            delete cp[parentId];
            return cp;
          });
          setReplyOpen((p) => ({ ...p, [parentId]: false }));
        },
        onError: (err: any) => {
          setReplyErrors((p) => ({
            ...p,
            [parentId]: err?.response?.data?.error || "Failed to post reply",
          }));
        },
      }
    );
  };

  const renderNestedComment = (node: CommentNode, level: number) => {
    return (
      <Box key={node.id} sx={{ ml: level > 0 ? 3 : 0, mt: level > 0 ? 1 : 2 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            bgcolor: level > 0 ? "action.hover" : "background.paper",
            borderLeft: level > 0 ? "3px solid #ccc" : "1px solid #e0e0e0",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Avatar
              src={node.authorDetails?.imgUrl}
              sx={{ width: 24, height: 24, fontSize: "0.8rem" }}
            >
              {node.authorDetails?.fname?.charAt(0) || "U"}
            </Avatar>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
              onClick={() => navigate(`/profile/${node.author}`)}
            >
              {node.authorDetails
                ? `${node.authorDetails.fname} ${node.authorDetails.lname}`
                : "Loading..."}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              • {node.issuedAt ? new Date(node.issuedAt).toLocaleString() : ""}
            </Typography>
          </Stack>

          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", ml: 0.5 }}>
            {node.content}
          </Typography>

          <Box sx={{ mt: 1 }}>
            <Button
              size="small"
              sx={{ textTransform: "none", minWidth: 0 }}
              onClick={() => handleToggleReply(node.id)}
              disabled={!canComment}
            >
              {replyOpen[node.id] ? "Cancel" : "Reply"}
            </Button>
          </Box>

          {replyOpen[node.id] && (
            <Box sx={{ mt: 1 }}>
              {replyErrors[node.id] && (
                <Alert severity="error" sx={{ mb: 1 }} size="small">
                  {replyErrors[node.id]}
                </Alert>
              )}
              {/* Added component="form" to enable Enter-to-submit */}
              <Box
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitReply(node.id);
                }}
              >
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    size="small"
                    autoFocus
                    placeholder="Write a reply..."
                    value={replyDrafts[node.id] || ""}
                    onChange={(e) =>
                      setReplyDrafts((p) => ({
                        ...p,
                        [node.id]: e.target.value,
                      }))
                    }
                  />
                  <Button
                    variant="contained"
                    size="small"
                    type="submit" // Trigger form onSubmit
                    disabled={
                      replyMutation.isPending ||
                      !(replyDrafts[node.id] || "").trim()
                    }
                  >
                    Reply
                  </Button>
                </Stack>
              </Box>
            </Box>
          )}
        </Paper>

        {node.children.length > 0 && (
          <Box sx={{ borderLeft: "1px solid", borderColor: "divider" }}>
            {node.children.map((ch) => renderNestedComment(ch, level + 1))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardHeader
        avatar={
          <Avatar src={post.author?.imgUrl}>
            {(post.author?.fname || "U").charAt(0)}
          </Avatar>
        }
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography
              variant="subtitle2"
              onClick={() => navigate(`/profile/${post.author?.id}`)}
              sx={{
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {post.author?.fname} {post.author?.lname}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              in
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{
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
        action={
          <IconButton
            size="small"
            color="error"
            onClick={() => setReportDialogOpen(true)}
            title="Report Post"
          >
            <ReportIcon fontSize="small" />
          </IconButton>
        }
      />

      <CardContent sx={{ pt: 0 }}>
        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
          {post.description}
        </Typography>

        {post.media?.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <ImageList
              variant="quilted"
              cols={post.media.length > 1 ? 2 : 1}
              gap={8}
            >
              {post.media.map((item) => (
                <ImageListItem key={item.id}>
                  <Box
                    component="img"
                    src={item.url}
                    sx={{
                      width: "100%",
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

        <Button size="small" onClick={onToggle} sx={{ mt: 2 }}>
          {isOpen
            ? "Hide comments"
            : `Show comments (${commentsCountToShow})`}
        </Button>

        {isOpen && (
          <Box sx={{ mt: 2 }}>
            {commentsQuery.isLoading ? (
              <CircularProgress
                size={20}
                sx={{ display: "block", mx: "auto" }}
              />
            ) : (
              <>
                {nestedComments.map((c) => renderNestedComment(c, 0))}

                {/* Added component="form" to enable Enter-to-submit for main comments */}
                <Box
                  component="form"
                  sx={{ mt: 3 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (commentDraft.trim()) onSubmitComment(commentDraft);
                  }}
                >
                  <Stack direction="row" spacing={1}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder={
                        canComment
                          ? "Write a comment..."
                          : "Subscribe to comment"
                      }
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      disabled={!canComment}
                    />
                    <Button
                      variant="contained"
                      type="submit"
                      disabled={!canComment || !commentDraft.trim()}
                    >
                      Post
                    </Button>
                  </Stack>
                </Box>
              </>
            )}
          </Box>
        )}
      </CardContent>

      <Dialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Report Post</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Please provide a reason for reporting this post.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Reason..."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleReportSubmit}
            variant="contained"
            color="error"
            disabled={!reportReason.trim()}
          >
            Report
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  );
}

export default FeedPostCard;
