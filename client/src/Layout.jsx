import { useState, useEffect } from 'react';
import { AppShell, Group, Burger, Text, ThemeIcon, Menu, Button, Avatar, NavLink, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
    IconLayoutDashboard, IconListDetails, IconChartPie3, 
    IconCoin, IconSettings, IconLogout, IconChartPie2, 
    IconShieldLock // <--- Icoon voor admin
} from '@tabler/icons-react';

function Layout() {
    const [opened, { toggle }] = useDisclosure();
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    // Basis navigatie items
    let navItems = [
        { label: 'Dashboard', icon: IconLayoutDashboard, link: '/dashboard' },
        { label: 'Transacties', icon: IconListDetails, link: '/transactions' },
        { label: 'Statistieken', icon: IconChartPie3, link: '/statistics' },
        { label: 'Budgetten', icon: IconCoin, link: '/budgets' },
        { label: 'Instellingen', icon: IconSettings, link: '/settings' },
    ];

    // ALS ADMIN: Voeg "Gebruikersbeheer" toe aan de lijst
    if (user && user.role === 'admin') {
        navItems.push({ 
            label: 'Gebruikersbeheer', 
            icon: IconShieldLock, 
            link: '/admin',
            color: 'grape' // Opvallend kleurtje
        });
    }

    return (
        <AppShell
            header={{ height: 70 }}
            navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
            padding="md"
            style={{ background: '#fcfcfc' }}
        >
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Group>
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                        <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                            <ThemeIcon size={30} radius="md" color="teal" variant="light">
                                <IconChartPie2 size={18} />
                            </ThemeIcon>
                            <Text fw={900} size="xl" c="teal">Belio</Text>
                        </Group>
                    </Group>
                    
                    {user && (
                        <Menu shadow="md" width={200} position="bottom-end">
                            <Menu.Target>
                                <Button variant="subtle" color="gray" leftSection={<Avatar color="teal" radius="xl" size="sm">{user.username?.slice(0, 2).toUpperCase()}</Avatar>}>
                                    {user.username}
                                </Button>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={handleLogout}>
                                    Uitloggen
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    )}
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                <AppShell.Section grow component={ScrollArea}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.label}
                            label={item.label}
                            leftSection={<item.icon size="1rem" stroke={1.5} />}
                            active={location.pathname === item.link}
                            onClick={() => {
                                navigate(item.link);
                                if (opened) toggle();
                            }}
                            color={item.color || "teal"}
                            variant="filled"
                            style={{ borderRadius: '8px', marginBottom: '4px' }}
                        />
                    ))}
                </AppShell.Section>
            </AppShell.Navbar>

            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
        </AppShell>
    );
}

export default Layout;