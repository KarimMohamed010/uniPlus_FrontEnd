import React, { useState, useEffect, useMemo } from 'react';
import { TextField, Autocomplete, CircularProgress, Box, Typography, Avatar, InputAdornment } from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { debounce } from '@mui/material/utils';

interface User {
    id: number;
    fname: string;
    lname: string;
    username: string;
    imgUrl?: string; // Optional since it might be null
}

import { useAuth } from '../context/AuthContext';

export default function UserSearch() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [options, setOptions] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const navigate = useNavigate();

    const [recentSearches, setRecentSearches] = useState<User[]>([]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('recentSearches');
            if (saved) {
                setRecentSearches(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to parse recent searches", e);
        }
    }, []);

    const saveToRecent = (user: User) => {
        const newRecent = [user, ...recentSearches.filter(u => u.id !== user.id)].slice(0, 3);
        setRecentSearches(newRecent);
        localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    };

    const fetchUsers = useMemo(
        () =>
            debounce(async (request: { input: string }, callback: (results?: User[]) => void) => {
                try {
                    const response = await client.get(`/users/search?query=${request.input}`);
                    callback(response.data.users);
                } catch (error) {
                    console.error("Error searching users", error);
                    callback([]);
                }
            }, 400),
        [],
    );

    useEffect(() => {
        let active = true;

        if (inputValue === '') {
            setOptions(recentSearches);
            return undefined;
        }

        setLoading(true);

        fetchUsers({ input: inputValue }, (results?: User[]) => {
            if (active) {
                let newOptions: User[] = [];

                if (results) {
                    newOptions = results.filter(u => u.id !== user?.id);
                }

                setOptions(newOptions);
                setLoading(false);
            }
        });

        return () => {
            active = false;
        };
    }, [inputValue, fetchUsers, recentSearches]);

    return (
        <Autocomplete
            id="user-search"
            sx={{
                width: 400,
                mr: 2
            }}
            open={open}
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(option) => `${option.fname} ${option.lname}`}
            options={options}
            loading={loading}
            onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
            }}
            onChange={(event, newValue) => {
                if (newValue) {
                    saveToRecent(newValue);
                    navigate(`/profile/${newValue.id}`);
                    setInputValue(""); // Clear input after selection
                }
            }}
            renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                    <Box component="li" key={option.id} {...otherProps} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar src={option.imgUrl} sx={{ width: 32, height: 32 }} >
                            {option.fname.charAt(0)}
                        </Avatar>
                        <Box>
                            <Typography variant="body1">{option.fname} {option.lname}</Typography>
                            <Typography variant="caption" color="text.secondary">@{option.username}</Typography>
                        </Box>
                    </Box>
                )
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    placeholder="Search users..."
                    size="small"
                    InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <React.Fragment>
                                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                                {params.InputProps.endAdornment}
                            </React.Fragment>
                        ),
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: '12px',
                            '& fieldset': {
                                borderColor: 'rgba(0, 0, 0, 0.23)',
                            },
                            '&:hover fieldset': {
                                borderColor: 'primary.main',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: 'primary.main',
                            },
                        },
                    }}
                />
            )}
        />
    );
}
