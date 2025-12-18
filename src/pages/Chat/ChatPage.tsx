import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  ListItemText,
  TextField,
  CircularProgress,
  IconButton,
  Divider,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { Send, Add } from "@mui/icons-material";
import { useSocket } from "../../hooks/useSocket";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { Link, useLocation, useNavigate } from "react-router-dom";
import client from "../../api/client";
import { format } from "date-fns";

interface Message {
  msgId: number;
  senderId: number;
  content: string;
  sentAt: string;
  isOwn?: boolean;
  seen?: boolean;
}

interface ChatSession {
  id: number;
  fname: string;
  lname: string;
  username?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  seen?: boolean;
  isSystem?: boolean; // New Field
  imgUrl?: string;
}

// ... (skipping to component)

export default function ChatPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const { refreshUnreadCount } = useNotification();
  const location = useLocation();
  const navigate = useNavigate(); // Add this line
  const [isLoading, setIsLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [conversations, setConversations] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]); // New State
  const [inputText, setInputText] = useState("");
  const [openNewChat, setOpenNewChat] = useState(false);
  const [newChatId, setNewChatId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Unified Sort Function
  const sortChats = (chats: ChatSession[]) => {
    return [...chats].sort((a, b) => {
      // 1. System Chat always first
      if (a.isSystem) return -1;
      if (b.isSystem) return 1;

      // 2. Self Chat always second (after System)
      // if (a.id === user?.id) return -1;
      // if (b.id === user?.id) return 1;

      // 3. Others sorted by time (newest first)
      return new Date(b.lastMessageTime || 0).getTime() -
        new Date(a.lastMessageTime || 0).getTime();
    });
  };

  // Initialize Conversations (DMs only + System Announcements)
  useEffect(() => {
    const initChats = async () => {
      let initialConvos: ChatSession[] = [];

      try {
        // Fetch System Announcements
        let systemChat: ChatSession | null = null;
        try {
          const annRes = await client.get("/announcements");
          const anns = annRes.data.announcements;
          setAnnouncements(anns);

          if (anns.length > 0 || user?.roles.global === 'admin' || user?.roles.global === 'student') {
            // Always show system chat
            systemChat = {
              id: -1, // Special ID
              fname: "System",
              lname: "Announcements",
              lastMessage: anns[0]?.content || "No announcements yet",
              lastMessageTime: anns[0]?.createdAt,
              seen: true,
              isSystem: true,
              imgUrl: "", // Maybe a system icon URL later
            };
          }
        } catch (err) {
          console.error("Failed to fetch announcements", err);
        }

        // Get both received and sent conversations
        const receivedRes = await client.get("/messages/received");
        const sentRes = await client.get("/messages/sent");

        // Combine and merge conversations (user might have both sent and received)
        const conversationMap = new Map<number, ChatSession>();

        // Add received conversations
        receivedRes.data.notifications.forEach((conv: any) => {
          conversationMap.set(conv.userId, {
            id: conv.userId,
            fname: conv.fname,
            lname: conv.lname,
            username: conv.username,
            lastMessage: conv.lastMessage,
            lastMessageTime: conv.lastMessageTime,
            seen: conv.seen,
            imgUrl: conv.imgUrl
          });
        });

        // Add/merge sent conversations
        sentRes.data.notifications.forEach((conv: any) => {
          const existing = conversationMap.get(conv.userId);
          if (existing) {
            // Keep the more recent message
            if (
              new Date(conv.lastMessageTime || 0) >
              new Date(existing.lastMessageTime || 0)
            ) {
              conversationMap.set(conv.userId, {
                id: conv.userId,
                fname: conv.fname,
                lname: conv.lname,
                username: conv.username,
                lastMessage: conv.lastMessage,
                lastMessageTime: conv.lastMessageTime,
                seen: conv.seen,
                imgUrl: conv.imgUrl
              });
            }
          } else {
            conversationMap.set(conv.userId, {
              id: conv.userId,
              fname: conv.fname,
              lname: conv.lname,
              username: conv.username,
              lastMessage: conv.lastMessage,
              lastMessageTime: conv.lastMessageTime,
              seen: conv.seen,
              imgUrl: conv.imgUrl
            });
          }
        });

        let allConvos = Array.from(conversationMap.values());
        if (systemChat) {
          allConvos.push(systemChat); // Add system chat to the list before sorting
        }
        setConversations(sortChats(allConvos));
      } catch (e) {
        console.error("Failed to fetch conversations", e);
      }
    };

    initChats();
    setIsLoading(false);
    // Refresh notification count when entering chat page
    refreshUnreadCount();
  }, [user, refreshUnreadCount]);

  // Handle navigation from notification or profile click
  useEffect(() => {
    const state = location.state as { activeChatId?: number } | null;
    if (state?.activeChatId) {
      // If we are already in this chat, do nothing
      if (activeChat?.id === state.activeChatId) {
        // Clear state properly via router to update location object
        navigate(location.pathname, { replace: true, state: {} });
        return;
      }

      // Check if it's already in the list
      const chatToActivate = conversations.find(c => c.id === state.activeChatId);
      if (chatToActivate) {
        setActiveChat(chatToActivate);
        navigate(location.pathname, { replace: true, state: {} });
      } else {
        // Chat doesn't exist yet, fetch user details
        client.get(`/users/id/${state.activeChatId}`)
          .then(res => {
            const userData = res.data.user;

            // Create the new chat object
            const newChat: ChatSession = {
              id: userData.id,
              fname: userData.fname,
              lname: userData.lname,
              username: userData.username,
              lastMessage: "New conversation",
              seen: true,
              imgUrl: userData.imgUrl
            };

            // Set active chat (the sync effect below will add it to conversations)
            setActiveChat(newChat);
          })
          .catch(err => console.error("Failed to load chat user", err))
          .finally(() => {
            navigate(location.pathname, { replace: true, state: {} });
          });
      }
    }
  }, [location.state, conversations]);

  // Ensure activeChat is always in conversations (fixes race conditions with initChats)
  useEffect(() => {
    if (activeChat && !conversations.some(c => c.id === activeChat.id)) {
      setConversations(prev => sortChats([activeChat, ...prev]));
    }
  }, [activeChat, conversations, user]);

  // Socket Events - Only handle user messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data: any) => {
      // If I sent the message, I've already added it optimistically. Ignore it.
      if (data.senderId === user?.id) return;

      // Update conversation with the new message (always, not just when active)
      setConversations((prev) => {
        const updated = prev.map((conv) =>
          conv.id === data.senderId
            ? {
              ...conv,
              lastMessage: data.content,
              lastMessageTime: data.sentAt,
              seen: false,
            }
            : conv
        );
        // Sort using unified logic
        return sortChats(updated);
      });

      // Only add to messages and mark as seen if chat is active
      if (activeChat?.id === data.senderId) {
        const newMessage = {
          msgId: data.msgId,
          senderId: data.senderId,
          content: data.content,
          sentAt: data.sentAt,
          isOwn: false,
          seen: false,
        };
        setMessages((prev) => [...prev, newMessage]);

        // Mark as seen immediately
        socket.emit("mark_messages_as_seen", {
          otherUserId: data.senderId,
        });
      }
    };

    const handleMessagesSeen = (data: any) => {
      if (activeChat?.id === data.seenBy) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.isOwn && msg.senderId === user?.id
              ? { ...msg, seen: true }
              : msg
          )
        );

        // Update conversation seen status
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === data.seenBy ? { ...conv, seen: true } : conv
          )
        );
      }
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("messages_seen", handleMessagesSeen);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("messages_seen", handleMessagesSeen);
    };
  }, [socket, activeChat, user]);

  // Fetch Chat History for Selected User
  useEffect(() => {
    if (!socket || !activeChat) return;

    setMessages([]);

    socket.emit(
      "get_chat_history",
      { otherUserId: activeChat.id, limit: 50 },
      (response: any) => {
        if (response.success) {
          const formatted = response.messages
            .map((m: any) => ({
              ...m,
              isOwn: m.senderId === user?.id,
              seen: m.seen,
            }))
            .sort(
              (a: Message, b: Message) =>
                new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
            );
          setMessages(formatted);
          scrollToBottom();

          // Mark received messages as seen
          if (formatted.length > 0) {
            socket.emit("mark_messages_as_seen", {
              otherUserId: activeChat.id,
            });
            // Refresh notification count after marking as seen
            refreshUnreadCount();
          }
        }
      }
    );
  }, [activeChat, socket, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const refreshAnnouncements = async () => {
    try {
      const annRes = await client.get("/announcements");
      setAnnouncements(annRes.data.announcements);
      // also update the conversation preview
      setConversations(prev => prev.map(c =>
        c.isSystem ? { ...c, lastMessage: annRes.data.announcements[0]?.content || "No announcements" } : c
      ));
    } catch (e) { console.error(e); }
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeChat) return;

    // Admin Announcement Logic
    if (activeChat.isSystem) {
      if (user?.roles.global === 'admin') {
        client.post("/announcements", { content: inputText })
          .then(() => {
            setInputText("");
            refreshAnnouncements();
          })
          .catch(err => alert("Failed to post announcement"));
      }
      return;
    }

    if (!socket) return;
    const content = inputText;
    setInputText("");

    socket.emit(
      "send_message",
      { receiverId: activeChat.id, content },
      (ack: any) => {
        if (ack.success) {
          const newMessage = {
            msgId: ack.msgId,
            senderId: user!.id,
            content: content,
            sentAt: ack.sentAt,
            isOwn: true,
            seen: false,
          };
          setMessages((prev) => [...prev, newMessage]);

          // Update conversation with the new message
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === activeChat.id
                ? {
                  ...conv,
                  lastMessage: content,
                  lastMessageTime: ack.sentAt,
                  seen: false,
                }
                : conv
            )
          );
        }
      }
    );
  };

  const startNewDm = async () => {
    if (!newChatId.trim()) return;

    try {
      const response = await client.get(`/users/${newChatId.trim()}`);

      const userData = response.data.user;
      const newChat: ChatSession = {
        id: userData.id,
        fname: userData.fname,
        lname: userData.lname,
        username: userData.username,
        lastMessage: "New conversation",
        seen: true,
      };

      // Check if conversation already exists
      const exists = conversations.find((c) => c.id === userData.id);
      if (!exists) {
        setConversations((prev) => [newChat, ...prev]);
      }

      setActiveChat(newChat);
      setOpenNewChat(false);
      setNewChatId("");
    } catch (error: any) {
      console.error("Failed to find user:", error);
      alert(error.response?.data?.error || "User not found");
    }
  };

  return (


    <Box sx={{ height: "calc(100vh - 100px)", display: "flex", gap: 2 }}>

      <Paper sx={{ width: 300, display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h6">Chats</Typography>
          <Fab
            size="small"
            color="primary"
            onClick={() => setOpenNewChat(true)}
          >
            <Add />
          </Fab>
        </Box>
        {isLoading &&
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
        }
        <Divider />

        <List sx={{ flexGrow: 1, overflow: "auto" }}>
          {conversations.map((c, idx) => (
            <ListItem key={`${c.id}`} disablePadding>
              <ListItemButton
                selected={activeChat?.id === c.id}
                onClick={() => setActiveChat(c)}
              >
                <ListItemAvatar>
                  {c.isSystem ? (
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>📢</Avatar>
                  ) : (
                    <Avatar src={c.imgUrl}>{c.fname.charAt(0)}</Avatar>

                  )}
                </ListItemAvatar>
                <ListItemText
                  primary={c.isSystem ? "System Announcements" : `${c.fname} ${c.lname}`}
                  secondary={
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: "normal",
                        color: "text.secondary",
                      }}
                    >
                      {!c.isSystem && (c.lastMessage)}
                    </Typography>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Paper
        sx={{ flexGrow: 1, display: "flex", flexDirection: "column", p: 2 }}
      >
        {activeChat ? (
          <>
            <Box sx={{ p: 1, borderBottom: "1px solid #eee", mb: 2 }}>
              <Typography variant="h6">
                {activeChat.isSystem ? (
                  "System Announcements"
                ) : (
                  <Link to={`/profile/${activeChat.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {activeChat.fname} {activeChat.lname}
                  </Link>
                )}
              </Typography>
            </Box>

            <Box
              sx={{
                flexGrow: 1,
                overflow: "auto",
                mb: 2,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {activeChat.isSystem ? (
                // Announcements Rendering
                announcements.map((ann, idx) => (
                  <Box
                    key={ann.id || idx}
                    sx={{
                      alignSelf: "flex-start", // Always left-aligned or center
                      width: "100%",
                      mb: 2
                    }}
                  >
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: "#FFEB3B",
                        color: "text.primary",
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight="bold">{ann.content}</Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                        <Typography variant="caption" color="text.primary">
                          {format(new Date(ann.createdAt), "PPpp")}
                        </Typography>
                        <Typography variant="caption" color="text.primary">
                          - {ann.author?.fname} {ann.author?.lname}
                        </Typography>
                      </Box>
                    </Paper>
                  </Box>
                ))
              ) : (
                // Regular Messages Rendering
                messages.map((msg, idx) => {
                  // Check if this is the last message sent by the current user
                  const isLastOwnMessage =
                    msg.isOwn && !messages.slice(idx + 1).some((m) => m.isOwn);

                  return (
                    <Box
                      key={idx}
                      sx={{
                        alignSelf: msg.isOwn ? "flex-end" : "flex-start",
                        maxWidth: "70%",
                      }}
                    >
                      <Paper
                        sx={{
                          p: 1.5,
                          bgcolor: msg.isOwn ? "primary.main" : "grey.100",
                          color: msg.isOwn ? "white" : "text.primary",
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="body2">{msg.content}</Typography>
                      </Paper>
                      <Box
                        sx={{
                          ml: msg.isOwn ? 0 : 1,
                          mr: msg.isOwn ? 1 : 0,
                          display: "flex",
                          gap: 0.5,
                          alignItems: "center",
                          justifyContent: msg.isOwn ? "flex-end" : "flex-start",
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: "text.secondary" }}
                        >
                          {format(new Date(msg.sentAt || Date.now()), "HH:mm")}
                        </Typography>
                        {isLastOwnMessage && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: msg.seen ? "primary.main" : "text.secondary",
                              fontWeight: msg.seen ? "bold" : "normal",
                            }}
                          >
                            {msg.seen ? "✓✓" : "✓"}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </Box>

            <Box
              component="form"
              onSubmit={handleSendMessage}
              sx={{ display: "flex", gap: 1 }}
            >
              <TextField
                fullWidth
                placeholder={activeChat.isSystem ? (user?.roles.global === 'admin' ? "Post an announcement..." : "Read only channel") : "Type a message..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                autoComplete="off"
                disabled={activeChat.isSystem && user?.roles.global !== 'admin'}
              />
              {(activeChat.isSystem && user?.roles.global === 'admin') || !activeChat.isSystem ? (
                <IconButton color="primary" type="submit" size="large">
                  <Send />
                </IconButton>
              ) : null}
            </Box>
          </>
        ) : (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Typography color="textSecondary">Select a conversation</Typography>
          </Box>
        )}
      </Paper>

      <Dialog open={openNewChat} onClose={() => setOpenNewChat(false)}>
        <DialogTitle>New Direct Message</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={newChatId}
            onChange={(e) => setNewChatId(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                startNewDm();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewChat(false)}>Cancel</Button>
          <Button onClick={startNewDm} variant="contained">
            Start Chat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
