import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
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
  DialogContentText,
  CircularProgress,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  ChatBubbleOutline as ReplyIcon,
  ReportProblem as ReportIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client from "../api/client";
import { FileUploaderRegular } from "@uploadcare/react-uploader";
import "@uploadcare/react-uploader/core.css";

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

function FeedPostCard({
  post,
  isOpen,
  onToggle,
  commentDraft,
  setCommentDraft,
  onSubmitComment,
}: {
  post: FeedPost;
  isOpen: boolean;
  onToggle: () => void;
  commentDraft: string;
  setCommentDraft: (value: string) => void;
  canComment: boolean;
  onSubmitComment: (content: string) => void;
}) {
  const queryClient = useQueryClient();

  // --- UI States ---
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [commentToDelete, setCommentToDelete] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "success" });

  // --- Post Edit States ---
  const [editDescription, setEditDescription] = useState(post.description);
  const [currentMedia, setCurrentMedia] = useState(post.media || []);
  const [localPost, setLocalPost] = useState(post);
  const uploadedUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  useEffect(() => {
    if (editDialogOpen) {
      setEditDescription(post.description);
      setCurrentMedia([...(post.media || [])]);
      uploadedUrlsRef.current.clear();
    }
  }, [editDialogOpen, post]);

  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<number, boolean>>({});
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<number, string>>({});

  const userJsonString = localStorage.getItem("user");
  const parsedUser = userJsonString ? JSON.parse(userJsonString) : null;
  const userID = parsedUser ? parseInt(parsedUser.id, 10) : 0;
  const isAdmin = parsedUser?.roles?.global === "admin";
  const isMyPost = post.author?.id === userID;

  // --- Mutations ---
  const editPostMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await client.patch(`/posts/${post.id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["feed"], (oldData: any) => {
        if (!oldData) return oldData;
        const updateFunc = (p: FeedPost) =>
          p.id === post.id ? { ...p, ...(data.post || data) } : p;
        if (Array.isArray(oldData)) return oldData.map(updateFunc);
        if (oldData.posts)
          return { ...oldData, posts: oldData.posts.map(updateFunc) };
        return oldData;
      });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      setSnackbar({
        open: true,
        message: "Post updated!",
        severity: "success",
      });
      setEditDialogOpen(false);
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || "Update Failed",
        severity: "error",
      });
    },
  });

  const reportPostMutation = useMutation({
    mutationFn: async (reportDescription: string) => {
      await client.post(`/posts/${post.id}/report`, {
        description: reportDescription,
      });
    },
    onSuccess: () => {
      setSnackbar({
        open: true,
        message: "Report submitted.",
        severity: "info",
      });
      setReportDialogOpen(false);
      setReportReason("");
    },
    onError: (err: any) => {
      setSnackbar({
        open: true,
        message: err?.response?.data?.message || "Report Failed",
        severity: "error",
      });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async () => {
      await client.delete(`/posts/${post.id}`);
    },
    onSuccess: () => {
      setSnackbar({ open: true, message: "Post deleted", severity: "success" });
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: number; content: string }) => {
      await client.patch(`/comments/${id}`, { content });
    },
    onSuccess: () => {
      setEditingCommentId(null);
      queryClient.invalidateQueries({ queryKey: ["postComments", post.id] });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: number) => {
      await client.delete(`/comments/${id}`);
    },
    onSuccess: () => {
      setSnackbar({
        open: true,
        message: "Comment deleted",
        severity: "success",
      });
      setCommentToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["postComments", post.id] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async (payload: { content: string; parentId: number }) => {
      await client.post(`/comments`, { postId: post.id, ...payload });
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["postComments", post.id] }),
  });

  // --- Handlers ---
  const handleEditSubmit = () => {
    const payload = {
      description: editDescription,
      media: currentMedia.map((m) => {
        const item: any = {
          url: m.url,
          type: m.type,
          description: m.description || "",
        };
        if (typeof m.id === "number" && m.id < 1000000000) item.id = m.id;
        return item;
      }),
    };
    editPostMutation.mutate(payload);
  };

  const handleUploadcareChange = (items: any) => {
    const entries = (items?.allEntries || []) as any[];
    const uploaded = entries
      .filter((f) => f?.status === "success" && f?.cdnUrl)
      .map((f) => ({
        url: String(f.cdnUrl),
        type: (f?.fileInfo?.mimeType as string)?.split("/")[0] || "image",
      }))
      .filter((item) => {
        if (uploadedUrlsRef.current.has(item.url)) return false;
        if (currentMedia.some((m) => m.url === item.url)) return false;
        uploadedUrlsRef.current.add(item.url);
        return true;
      });
    if (uploaded.length > 0) {
      setCurrentMedia((prev) => [...prev, ...uploaded]);
    }
  };

  const submitReply = (parentId: number) => {
    const text = (replyDrafts[parentId] || "").trim();
    if (!text) return;
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
      }
    );
  };

  const handleMainCommentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (commentDraft.trim()) onSubmitComment(commentDraft);
    }
  };

  const handleReplyKeyDown = (e: React.KeyboardEvent, parentId: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitReply(parentId);
    }
  };

  const handleEditCommentKeyDown = (e: React.KeyboardEvent, nodeId: number) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = editDrafts[nodeId]?.trim();
      if (text) editCommentMutation.mutate({ id: nodeId, content: text });
    }
  };

  // --- Comments Query ---
  const commentsQuery = useQuery<CommentItem[]>({
    queryKey: ["postComments", post.id],
    queryFn: async () => {
      const res = await client.get(`/comments/post/${post.id}`);
      const raw = Array.isArray(res.data?.comments) ? res.data.comments : [];
      return await Promise.all(
        raw.map(async (c: CommentItem) => {
          if (!c.author) return c;
          try {
            const userRes = await client.get(`/users/id/${c.author}`);
            return { ...c, authorDetails: userRes.data.user };
          } catch {
            return c;
          }
        })
      );
    },
    enabled: isOpen,
  });

  const nestedComments = useMemo(() => {
    const map = new Map<number, CommentNode>();
    const roots: CommentNode[] = [];
    (commentsQuery.data || []).forEach((c) =>
      map.set(c.id, { ...c, children: [] })
    );
    map.forEach((node) => {
      if (node.parentId && map.has(node.parentId))
        map.get(node.parentId)!.children.push(node);
      else roots.push(node);
    });
    return roots;
  }, [commentsQuery.data]);

  const renderNestedComment = (node: CommentNode, level: number) => (
    <Box key={node.id} sx={{ ml: level > 0 ? 3 : 0, mt: 2 }}>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          bgcolor: level > 0 ? "action.hover" : "background.paper",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <Avatar
            src={node.authorDetails?.imgUrl}
            sx={{ width: 24, height: 24 }}
          />
          <Typography variant="subtitle2" fontWeight={700}>
            {node.authorDetails
              ? `${node.authorDetails.fname} ${node.authorDetails.lname}`
              : "User"}
          </Typography>
        </Stack>
        {editingCommentId === node.id ? (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              autoFocus
              value={editDrafts[node.id] || ""}
              onChange={(e) =>
                setEditDrafts((p) => ({ ...p, [node.id]: e.target.value }))
              }
              onKeyDown={(e) => handleEditCommentKeyDown(e, node.id)}
            />
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                const text = editDrafts[node.id]?.trim();
                if (text)
                  editCommentMutation.mutate({ id: node.id, content: text });
              }}
            >
              Save
            </Button>
            <Button size="small" onClick={() => setEditingCommentId(null)}>
              Cancel
            </Button>
          </Stack>
        ) : (
          <Typography variant="body2">{node.content}</Typography>
        )}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: 1 }}
        >
          <Button
            size="small"
            startIcon={<ReplyIcon sx={{ fontSize: "1rem" }} />}
            onClick={() =>
              setReplyOpen((p) => ({ ...p, [node.id]: !p[node.id] }))
            }
          >
            Reply
          </Button>
          {(node.author === userID || isAdmin) && (
            <Stack direction="row" spacing={1}>
              {node.author === userID && (
                <Button
                  size="small"
                  startIcon={<EditIcon sx={{ fontSize: "1rem" }} />}
                  onClick={() => {
                    setEditingCommentId(node.id);
                    setEditDrafts((p) => ({ ...p, [node.id]: node.content }));
                  }}
                >
                  Edit
                </Button>
              )}
              <Button
                size="small"
                color="error"
                startIcon={<DeleteIcon sx={{ fontSize: "1rem" }} />}
                onClick={() => setCommentToDelete(node.id)}
              >
                Delete
              </Button>
            </Stack>
          )}
        </Stack>
        {replyOpen[node.id] && !editingCommentId && (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Write a reply..."
              value={replyDrafts[node.id] || ""}
              onChange={(e) =>
                setReplyDrafts((p) => ({ ...p, [node.id]: e.target.value }))
              }
              onKeyDown={(e) => handleReplyKeyDown(e, node.id)}
            />
            <Button
              size="small"
              variant="contained"
              onClick={() => submitReply(node.id)}
            >
              Reply
            </Button>
          </Stack>
        )}
      </Paper>
      {node.children.map((ch) => renderNestedComment(ch, level + 1))}
    </Box>
  );

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardHeader
        avatar={
          <Avatar src={localPost.author?.imgUrl}>
            {(localPost.author?.fname || "U").charAt(0)}
          </Avatar>
        }
        title={`${localPost.author?.fname} ${localPost.author?.lname}`}
        subheader={new Date(localPost.issuedAt).toLocaleString()}
        action={
          <Stack direction="row" spacing={0.5}>
            {isMyPost ? (
              <>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <DeleteIcon />
                </IconButton>
              </>
            ) : (
             <IconButton
      size="small"
        sx={{
    color: "text.secondary",
    "&:hover": {
      color: "warning.main",
    },
    "&:focus-visible": {
      color: "warning.main",
    },
  }}
  onClick={() => setReportDialogOpen(true)}
>
                <ReportIcon />
              </IconButton>
            )}
          </Stack>
        }
      />

      <CardContent sx={{ pt: 0 }}>
        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
          {localPost.description}
        </Typography>
        {localPost.media?.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <ImageList
              variant="quilted"
              cols={localPost.media.length > 1 ? 2 : 1}
              gap={8}
            >
              {localPost.media.map((item) => (
                <ImageListItem key={item.id}>
                  <Box
                    component="img"
                    src={item.url}
                    sx={{ width: "100%", borderRadius: 2 }}
                  />
                </ImageListItem>
              ))}
            </ImageList>
          </Box>
        )}
        <Button size="small" onClick={onToggle} sx={{ mt: 2 }}>
          {isOpen
            ? "Hide comments"
            : `Show comments (${commentsQuery.data?.length || 0})`}
        </Button>

        {isOpen && (
          <Box sx={{ mt: 2 }}>
            {nestedComments.map((c) => renderNestedComment(c, 0))}
            <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Comment..."
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={handleMainCommentKeyDown}
              />
              <Button
                variant="contained"
                disabled={!commentDraft.trim()}
                onClick={() => onSubmitComment(commentDraft)}
              >
                Post
              </Button>
            </Stack>
          </Box>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Post</DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            sx={{ mb: 3, mt: 1 }}
          />
          <FileUploaderRegular
            sourceList="local,camera,gdrive"
            classNameUploader="uc-light"
            pubkey="1ed9d5259738cb825f1c"
            multiple={true}
            onChange={handleUploadcareChange}
          />
          <ImageList cols={3} rowHeight={120} gap={8} sx={{ mt: 2 }}>
            {currentMedia.map((item, index) => (
              <ImageListItem
                key={item.id || index}
                sx={{
                  position: "relative",
                  border: "1px solid #eee",
                  borderRadius: 1,
                  overflow: "hidden",
                }}
              >
                <Box
                  component="img"
                  src={item.url}
                  sx={{ height: "100%", width: "100%", objectFit: "cover" }}
                />
                <IconButton
                  size="small"
                  onClick={() =>
                    setCurrentMedia((p) => p.filter((_, i) => i !== index))
                  }
                  sx={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    bgcolor: "rgba(0,0,0,0.6)",
                    color: "white",
                  }}
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </ImageListItem>
            ))}
          </ImageList>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={editPostMutation.isPending}
          >
            {editPostMutation.isPending ? (
              <CircularProgress size={24} />
            ) : (
              "Save"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Report Dialog */}
      <Dialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
      >
        <DialogTitle>Report Post</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Why are you reporting this post?
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Reason..."
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => reportPostMutation.mutate(reportReason)}
            color="warning"
            variant="contained"
            disabled={!reportReason.trim() || reportPostMutation.isPending}
          >
            {reportPostMutation.isPending ? "Sending..." : "Submit Report"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialogs */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Post?</DialogTitle>
        <DialogContent>
          <DialogContentText>This action cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => deletePostMutation.mutate()}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(commentToDelete)}
        onClose={() => setCommentToDelete(null)}
      >
        <DialogTitle>Delete Comment?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to remove this comment?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentToDelete(null)}>Cancel</Button>
          <Button
            onClick={() =>
              commentToDelete && deleteCommentMutation.mutate(commentToDelete)
            }
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Card>
  );
}

export default FeedPostCard;
