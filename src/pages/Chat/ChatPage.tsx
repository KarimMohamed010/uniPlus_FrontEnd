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
  lastMessage?: string;
  lastMessageTime?: string;
  seen?: boolean;
}

export default function ChatPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [conversations, setConversations] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [openNewChat, setOpenNewChat] = useState(false);
  const [newChatId, setNewChatId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Conversations (DMs only)
  useEffect(() => {
    const initChats = async () => {
      let initialConvos: ChatSession[] = [];

      try {
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
            lastMessage: conv.lastMessage,
            lastMessageTime: conv.lastMessageTime,
            seen: conv.seen,
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
                lastMessage: conv.lastMessage,
                lastMessageTime: conv.lastMessageTime,
                seen: conv.seen,
              });
            }
          } else {
            conversationMap.set(conv.userId, {
              id: conv.userId,
              fname: conv.fname,
              lname: conv.lname,
              lastMessage: conv.lastMessage,
              lastMessageTime: conv.lastMessageTime,
              seen: conv.seen,
            });
          }
        });

        // Sort by newest first
        initialConvos = Array.from(conversationMap.values()).sort(
          (a, b) =>
            new Date(b.lastMessageTime || 0).getTime() -
            new Date(a.lastMessageTime || 0).getTime()
        );

        setConversations(initialConvos);
      } catch (e) {
        console.error("Failed to fetch conversations", e);
      }
    };

    initChats();
  }, [user]);

  // Socket Events - Only handle user messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data: any) => {
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
        // Sort by most recent first
        return updated.sort(
          (a, b) =>
            new Date(b.lastMessageTime || 0).getTime() -
            new Date(a.lastMessageTime || 0).getTime()
        );
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
          otherUserId: activeChat.id,
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

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeChat || !socket) return;
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
        <Divider />
        <List sx={{ flexGrow: 1, overflow: "auto" }}>
          {conversations.map((c, idx) => (
            <ListItem key={`${c.id}`} disablePadding>
              <ListItemButton
                selected={activeChat?.id === c.id}
                onClick={() => setActiveChat(c)}
              >
                <ListItemAvatar>
                  <Avatar>{c.fname.charAt(0)}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${c.fname} ${c.lname}`}
                  secondary={
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: "normal",
                        noWrap: true,
                        color: "text.secondary",
                      }}
                    >
                      {c.lastMessage}
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
                {activeChat.fname} {activeChat.lname}
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
              {messages.map((msg, idx) => {
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
              })}
              <div ref={messagesEndRef} />
            </Box>

            <Box
              component="form"
              onSubmit={handleSendMessage}
              sx={{ display: "flex", gap: 1 }}
            >
              <TextField
                fullWidth
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                autoComplete="off"
              />
              <IconButton color="primary" type="submit" size="large">
                <Send />
              </IconButton>
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
