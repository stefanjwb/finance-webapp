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
    Divider
} from '@mantine/core';
import { IconAt, IconLock, IconBrandFacebook } from '@tabler/icons-react';

// Constanten
const BRAND_COLOR = '#710081';

function Login() {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // BELANGRIJK: Gebruik de ingestelde variabele of fallback naar 5001 (voor Mac support)
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
            
            console.log("Inloggen via:", API_URL); // Voor debugging

            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Inloggen mislukt. Controleer je gegevens.');
            }

            // Token en gebruikersinfo opslaan in de browser
            localStorage.setItem('token', data.token);
            if (data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            // Doorsturen naar de hoofdpagina (Dashboard)
            console.log("Login succesvol, doorsturen...");
            navigate('/'); 

        } catch (err) {
            console.error(err);
            setError(err.message);
        }
    };

    return (
        <Box style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
            
            {/* ================= LINKER KANT (Afbeelding) ================= */}
            <Box 
                visibleFrom="md" 
                style={{ 
                    flex: 1,
                    // LET OP: Geen '/public' in de url zetten, gewoon direct de bestandsnaam!
                    backgroundImage: 'url("/overdruiven_inlog_afbeelding.png")',
                    backgroundSize: 'cover',
                    // Hier zorgen we dat de bovenkant van de foto zichtbaar blijft:
                    backgroundPosition: 'top center',
                    backgroundColor: '#2d0a31'
                }}
            />

            {/* ================= RECHTER KANT (Formulier) ================= */}
            <Box style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                backgroundColor: 'white',
                padding: '40px',
                maxWidth: '600px'
            }}>
                <Container size="xs" w="100%">
                    
                    <Title order={1} fw={900} c="dark" 
                    style={{ fontFamily: 'Inter, sans-serif', fontSize: '2rem' }}>
                        Welkom Terug
                    </Title>
                    <Text c="dimmed" size="sm" mt={5} mb={30}>
                        Log in bij Chateau Overdruiven
                    </Text>
        
                    {error && <Text c="red" size="sm" mb="md">{error}</Text>}
        
                    <form onSubmit={handleSubmit}>
                        <Stack gap="lg">
                            <TextInput 
                                label="Gebruikersnaam"
                                placeholder="Je naam of e-mail" 
                                size="md" required
                                leftSection={<IconAt size={18} stroke={1.5} color={'#ced4da'} />}
                                value={formData.username}
                                onChange={(e) => setFormData({...formData, username: e.currentTarget.value})}
                            />
                            
                            <Stack gap={5}>
                                <PasswordInput 
                                    label="Wachtwoord"
                                    placeholder="Je wachtwoord" 
                                    size="md" required
                                    leftSection={<IconLock size={18} stroke={1.5} color={'#ced4da'} />}
                                    value={formData.password}
                                    onChange={(e) => setFormData({...formData, password: e.currentTarget.value})}
                                />
                                <Group justify="flex-end">
                                    <Anchor component="button" type="button" size="xs" c="dimmed" fw={500}>
                                        Wachtwoord vergeten?
                                    </Anchor>
                                </Group>
                            </Stack>
                            
                            <Button 
                                fullWidth mt="sm" size="md" type="submit"
                                color={BRAND_COLOR}
                                styles={{ root: { backgroundColor: BRAND_COLOR, transition: 'all 0.2s', '&:hover': { backgroundColor: '#5a0066' } } }}
                            >
                                Login
                            </Button>
                        </Stack>
                    </form>

                    <Divider label="Of ga verder met" labelPosition="center" my="lg" />

                    <Group grow mb="md" mt="md">
                        <Button 
                            leftSection={<GoogleIcon />} 
                            variant="default" color="gray" radius="md"
                            onClick={() => alert("Google nog niet gekoppeld")}
                        >
                            Google
                        </Button>

                        <Button 
                            leftSection={<IconBrandFacebook size={18} />} 
                            radius="md"
                            bg="#4267B2" c="white"
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

// Google Icoon Component (om de hoofdcode schoon te houden)
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