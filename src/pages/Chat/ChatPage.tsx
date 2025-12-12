import React, { useState, useEffect, useRef } from 'react';
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
  Chip
} from '@mui/material';
import { Send, Add, AccountCircle, Group } from '@mui/icons-material';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import { format } from 'date-fns';

interface Message {
  msgId: number;
  senderId: number;
  content: string;
  sendAt: string;
  isOwn?: boolean;
}

interface ChatSession {
    type: 'user' | 'team';
    id: number;
    name: string;
    lastMessage?: string;
}

export default function ChatPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  const [conversations, setConversations] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [openNewChat, setOpenNewChat] = useState(false);
  const [newChatId, setNewChatId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Conversations (DMs + Teams)
  useEffect(() => {
    const initChats = async () => {
        let initialConvos: ChatSession[] = [];

        // 1. Get DMs from notifications (existing logic)
        try {
            const res = await client.get('/messages');
            const senders = new Set<number>();
            res.data.notifications.forEach((n: any) => senders.add(n.senderId));
            Array.from(senders).forEach(id => {
                initialConvos.push({ type: 'user', id, name: `User ${id}`, lastMessage: 'History available' });
            });
        } catch (e) {
            console.error("Failed to fetch DMs", e);
        }

        // 2. Get Teams from User Roles
        if (user?.roles.team) {
            for (const t of user.roles.team) {
                // Ideally fetch team name
                try {
                    const teamRes = await client.get(`/teams/${t.teamId}`);
                     initialConvos.push({ 
                         type: 'team', 
                         id: t.teamId, 
                         name: teamRes.data.name || `Team ${t.teamId}`, 
                         lastMessage: 'Team Channel' 
                    });
                } catch {
                     initialConvos.push({ type: 'team', id: t.teamId, name: `Team ${t.teamId}`, lastMessage: 'Team Channel' });
                }
            }
        }

        setConversations(initialConvos);
    };

    initChats();
  }, [user]);

  // Socket Events
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (data: any) => {
        if (activeChat?.type === 'user' && activeChat.id === data.senderId) {
             setMessages(prev => [...prev, {
                msgId: data.msgId,
                senderId: data.senderId,
                content: data.content,
                sendAt: data.sendAt,
                isOwn: false
            }]);
        }
    };

    const handleReceiveTeamMessage = (data: any) => {
        if (activeChat?.type === 'team' && activeChat.id === data.teamId) {
             setMessages(prev => [...prev, {
                msgId: data.msgId, // Assuming structure
                senderId: data.senderId,
                content: data.content,
                sendAt: data.sendAt,
                isOwn: data.senderId === user?.id
            }]);
        }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('receive_team_message', handleReceiveTeamMessage);

    return () => {
        socket.off('receive_message', handleReceiveMessage);
        socket.off('receive_team_message', handleReceiveTeamMessage);
    };
  }, [socket, activeChat, user]);

  // Join Team Room & Fetch History
  useEffect(() => {
    if (!socket || !activeChat) return;

    setMessages([]);

    if (activeChat.type === 'team') {
        socket.emit('join_team', { teamId: activeChat.id });
        // Fetch team history - backend needs to support this. Assuming similar event or separate API
        // For now, let's assume we start empty or fetch via API if socket doesn't support history for teams yet
         socket.emit('get_team_chat_history', { teamId: activeChat.id, limit: 50 }, (response: any) => {
            if (response && response.success) {
                 const formatted = response.messages.map((m: any) => ({
                    ...m,
                    isOwn: m.senderId === user?.id
                }));
                setMessages(formatted);
                scrollToBottom();
            }
        });
    } else {
         socket.emit('get_chat_history', { otherUserId: activeChat.id, limit: 50 }, (response: any) => {
            if (response.success) {
                const formatted = response.messages.map((m: any) => ({
                    ...m,
                    isOwn: m.senderId === user?.id
                }));
                setMessages(formatted);
                scrollToBottom();
            }
        });
    }
  }, [activeChat, socket, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !activeChat || !socket) return;
    const content = inputText;
    setInputText('');

    if (activeChat.type === 'user') {
        socket.emit('send_message', { receiverId: activeChat.id, content }, (ack: any) => {
            if (ack.success) {
                setMessages(prev => [...prev, {
                    msgId: ack.msgId,
                    senderId: user!.id,
                    content: content,
                    sendAt: ack.sendAt,
                    isOwn: true
                }]);
            }
        });
    } else {
        socket.emit('send_team_message', { teamId: activeChat.id, content }, (ack: any) => {
             // Team messages come back via broadcast usually, but if ack contains it, we can optimistic add
             // If backend broadcasts to sender too, we might duplicate if we add here. 
             // Usually socket.io broadcasts to Room excludes sender? Check backend.
             // Looking at backend code via memory: socket.to(room).emit... excludes sender.
             // So we should add it here.
             if (ack.success) {
                 setMessages(prev => [...prev, {
                    msgId: ack.msgId,
                    senderId: user!.id,
                    content: content,
                    sendAt: ack.sendAt,
                    isOwn: true
                }]);
             }
        });
    }
  };

  const startNewDm = () => {
       const id = parseInt(newChatId);
       if (!isNaN(id)) {
           const newChat: ChatSession = { type: 'user', id, name: `User ${id}` };
           setConversations(prev => [...prev, newChat]);
           setActiveChat(newChat);
           setOpenNewChat(false);
       }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', gap: 2 }}>
      <Paper sx={{ width: 300, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Chats</Typography>
            <Fab size="small" color="primary" onClick={() => setOpenNewChat(true)}>
                <Add />
            </Fab>
        </Box>
        <Divider />
        <List sx={{ flexGrow: 1, overflow: 'auto' }}>
            {conversations.map((c, idx) => (
                <ListItem key={`${c.type}-${c.id}`} disablePadding>
                    <ListItemButton
                        selected={activeChat?.type === c.type && activeChat?.id === c.id}
                        onClick={() => setActiveChat(c)}
                    >
                        <ListItemAvatar>
                            <Avatar>
                                {c.type === 'team' ? <Group /> : <AccountCircle />}
                            </Avatar>
                        </ListItemAvatar>
                        <ListItemText 
                            primary={c.name} 
                            secondary={c.lastMessage}
                             secondaryTypographyProps={{ noWrap: true }}
                        />
                    </ListItemButton>
                </ListItem>
            ))}
        </List>
      </Paper>

      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
         {activeChat ? (
            <>
                <Box sx={{ p: 1, borderBottom: '1px solid #eee', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    {activeChat.type === 'team' && <Chip label="Team" color="secondary" size="small" />}
                    <Typography variant="h6">{activeChat.name}</Typography>
                </Box>
                
                 <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {messages.map((msg, idx) => (
                        <Box 
                            key={idx} 
                            sx={{ 
                                alignSelf: msg.isOwn ? 'flex-end' : 'flex-start',
                                maxWidth: '70%',
                            }}
                        >
                            <Paper sx={{ 
                                p: 1.5, 
                                bgcolor: msg.isOwn ? 'primary.main' : 'grey.100', 
                                color: msg.isOwn ? 'white' : 'text.primary',
                                borderRadius: 2
                            }}>
                                <Typography variant="body1">{msg.content}</Typography>
                            </Paper>
                            <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary', display: 'block', textAlign: msg.isOwn ? 'right': 'left' }}>
                                 {format(new Date(msg.sendAt || Date.now()), 'HH:mm')}
                             </Typography>
                        </Box>
                    ))}
                    <div ref={messagesEndRef} />
                </Box>

                <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', gap: 1 }}>
                    <TextField 
                        fullWidth 
                        placeholder="Type a message..." 
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        autoComplete="off"
                    />
                    <IconButton color="primary" type="submit" size="large">
                        <Send />
                    </IconButton>
                </Box>
            </>
         ) : (
             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
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
                label="User ID"
                type="number"
                fullWidth
                variant="outlined"
                value={newChatId}
                onChange={e => setNewChatId(e.target.value)}
              />
          </DialogContent>
          <DialogActions>
              <Button onClick={() => setOpenNewChat(false)}>Cancel</Button>
              <Button onClick={startNewDm}>Start Chat</Button>
          </DialogActions>
      </Dialog>
    </Box>
  );
}
