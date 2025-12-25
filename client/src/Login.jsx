import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    TextInput,
    PasswordInput,
    Anchor,
    Title,
    Text,
    Container,
    Group,
    Button,
    Box,
    Stack,
    Divider,
    Alert,
    Paper
} from '@mantine/core';
import { IconAt, IconLock, IconBrandFacebook, IconAlertCircle } from '@tabler/icons-react';

// Constanten - Aangepast naar Teal (Groen)
const BRAND_COLOR = '#12b886'; // Mantine Teal

function Login() {
    // State management
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); 
    
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // API URL bepalen
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Inloggen mislukt. Controleer je gegevens.');
            }

            // Opslaan in local storage
            localStorage.setItem('token', data.token);
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            console.log("Login succesvol als:", data.user.role);

            // Check de rol en stuur door naar de juiste pagina
            if (data.user && data.user.role === 'admin') {
                navigate('/admin'); // Admin gaat naar Admin Panel
            } else {
                navigate('/dashboard');      // Gewone gebruiker gaat naar Dashboard
            }

        } catch (err) {
            console.error(err);
            setError(err.message);
            setLoading(false); 
        }
    };

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <Box style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
            
            {/* ================= LINKER KANT (Afbeelding) ================= */}
            <Box 
                visibleFrom="md" 
                style={{ 
                    flex: 1,
                    // Afbeelding toegevoegd
                    backgroundImage: 'url("https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80")',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: '#E6FCF5' // Fallback kleur (licht groen)
                }}
            />

            {/* ================= RECHTER KANT (Formulier) ================= */}
            <Box style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                backgroundColor: 'white',
                padding: '40px'
            }}>
                <Container size="xs" w="100%">
                    
                    <Stack align="left" mb={30}>
                        <Title order={1} fw={900} c="dark" style={{ fontFamily: 'Inter, sans-serif' }}>
                            Log in bij Belio
                        </Title>
                        <Text c="dimmed" size="sm">
                            Welkom terug! Vul je gegevens in om verder te gaan.
                        </Text>
                    </Stack>
        
                    {error && (
                        <Alert icon={<IconAlertCircle size={16} />} title="Foutmelding" color="red" variant="light" mb="lg">
                            {error}
                        </Alert>
                    )}
        
                    <form onSubmit={handleSubmit}>
                        <Stack gap="lg">
                            <TextInput 
                                label="Gebruikersnaam"
                                placeholder="Je naam of e-mail" 
                                size="md" 
                                required
                                disabled={loading}
                                leftSection={<IconAt size={18} stroke={1.5} color="#ced4da" />}
                                value={formData.username}
                                onChange={(e) => handleChange('username', e.currentTarget.value)}
                            />
                            
                            <Stack gap={5}>
                                <PasswordInput 
                                    label="Wachtwoord"
                                    placeholder="Je wachtwoord" 
                                    size="md" 
                                    required
                                    disabled={loading}
                                    leftSection={<IconLock size={18} stroke={1.5} color="#ced4da" />}
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.currentTarget.value)}
                                />
                                <Group justify="flex-end">
                                    <Anchor component="button" type="button" size="xs" c="dimmed" fw={500}>
                                        Wachtwoord vergeten?
                                    </Anchor>
                                </Group>
                            </Stack>
                            
                            <Button 
                                fullWidth 
                                mt="sm" 
                                size="md" 
                                type="submit"
                                loading={loading}
                                color={BRAND_COLOR}
                                styles={{ 
                                    root: { 
                                        backgroundColor: BRAND_COLOR, 
                                        transition: 'background-color 0.2s', 
                                        '&:hover': { backgroundColor: '#099268' } // Iets donkerder groen voor hover
                                    } 
                                }}
                            >
                                Login
                            </Button>
                        </Stack>
                    </form>

                    <Divider label="Of ga verder met" labelPosition="center" my="lg" />

                    <Group grow mb="md">
                        <Button 
                            leftSection={<GoogleIcon />} 
                            variant="default" color="gray" radius="md"
                            disabled={loading}
                            onClick={() => alert("Google nog niet gekoppeld")}
                        >
                            Google
                        </Button>

                        <Button 
                            leftSection={<IconBrandFacebook size={18} />} 
                            radius="md"
                            bg="#4267B2" c="white"
                            disabled={loading}
                            onClick={() => alert("Facebook nog niet gekoppeld")}
                            styles={{ root: { '&:hover': { backgroundColor: '#365899' } } }}
                        >
                            Facebook
                        </Button>
                    </Group>
        
                    <Text ta="center" mt="xl" size="sm" c="dimmed">
                        Nog geen account?{' '}
                        <Anchor component={Link} to="/register" fw={700} c={BRAND_COLOR}>
                            Meld je aan
                        </Anchor>
                    </Text>
                </Container>
            </Box>
        </Box>
    );
}

// Compacte Google Icon component
function GoogleIcon(props) {
    return (
        <svg {...props} viewBox="0 0 24 24" width="1rem" height="1rem" xmlns="http://www.w3.org/2000/svg">
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.23856)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.225 -9.429 56.472 -10.689 57.251 L -10.689 60.158 L -6.839 60.158 C -4.604 58.118 -3.264 55.112 -3.264 51.509 Z" />
                <path fill="#34A853" d="M -14.754 63.239 C -11.519 63.239 -8.804 62.157 -6.824 60.158 L -10.689 57.251 C -11.764 57.973 -13.139 58.393 -14.754 58.393 C -17.879 58.393 -20.529 56.276 -21.469 53.438 L -25.439 53.438 L -25.439 56.518 C -23.479 60.408 -19.419 63.239 -14.754 63.239 Z" />
                <path fill="#FBBC05" d="M -21.469 53.438 C -21.709 52.714 -21.839 51.943 -21.839 51.149 C -21.839 50.355 -21.709 49.585 -21.469 48.861 L -21.469 45.781 L -25.439 45.781 C -26.249 47.406 -26.709 49.227 -26.709 51.149 C -26.709 53.071 -26.249 54.893 -25.439 56.518 L -21.469 53.438 Z" />
                <path fill="#EA4335" d="M -14.754 43.904 C -12.989 43.904 -11.419 44.512 -10.169 45.696 L -6.744 42.271 C -8.804 40.353 -11.519 39.239 -14.754 39.239 C -19.419 39.239 -23.479 42.069 -25.439 45.961 L -21.469 48.861 C -20.529 46.024 -17.879 43.904 -14.754 43.904 Z" />
            </g>
        </svg>
    );
}

export default Login;