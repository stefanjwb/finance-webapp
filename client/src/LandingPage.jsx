// client/src/LandingPage.jsx
import { 
    Container, Title, Text, Button, Group, SimpleGrid, ThemeIcon, Card, 
    rem, Image, Box, Stack, Overlay 
  } from '@mantine/core';
  import { IconChartPie3, IconCoin, IconLock, IconCheck } from '@tabler/icons-react';
  import { useNavigate } from 'react-router-dom';
  
  function LandingPage() {
    const navigate = useNavigate();
  
    return (
      <Box>
        {/* --- NAVBAR --- */}
        <Box py="md" style={{ borderBottom: '1px solid #eee', background: 'white' }}>
          <Container size="lg">
            <Group justify="space-between" align="center">
              {/* Logo */}
              <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                 <ThemeIcon size={30} radius="md" color="teal" variant="light">
                    <IconChartPie3 size={18} />
                 </ThemeIcon>
                 <Text fw={900} size="xl" c="teal">Belio</Text>
              </Group>
  
              {/* Desktop Navigatie Knoppen */}
              <Group>
                <Button variant="subtle" color="gray" onClick={() => navigate('/login')}>
                  Inloggen
                </Button>
                <Button variant="filled" color="teal" radius="md" onClick={() => navigate('/register')}>
                  Start Gratis
                </Button>
              </Group>
            </Group>
          </Container>
        </Box>
  
        {/* --- HERO SECTIE --- */}
        <div style={{ background: 'linear-gradient(180deg, #E6FCF5 0%, #ffffff 100%)', padding: '100px 0' }}>
          <Container size="lg">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={60} verticalSpacing={40}>
              
              {/* Linkerkant: Tekst */}
              <Stack justify="center">
                <Title order={1} size="h1" fw={900} style={{ fontSize: rem(48), lineHeight: 1.1 }}>
                  Rust in je hoofd met <Text span c="teal" inherit>Belio</Text>
                </Title>
                
                <Text c="dimmed" size="lg" style={{ lineHeight: 1.6 }}>
                  Je persoonlijke financiële gids. Stop met gissen, start met weten. 
                  Wij helpen je zorgeloos bouwen aan je toekomst, zonder verborgen kosten.
                </Text>
  
                <Group mt="md">
                  <Button size="lg" color="teal" radius="md" onClick={() => navigate('/register')}>
                    Start Zorgeloos
                  </Button>
                  <Button size="lg" variant="default" radius="md" onClick={() => navigate('/login')}>
                    Meer weten
                  </Button>
                </Group>
  
                <Group gap="xs" mt="sm">
                  <IconCheck size={16} color="teal" />
                  <Text size="sm" c="dimmed">Geen creditcard nodig</Text>
                  <IconCheck size={16} color="teal" style={{ marginLeft: 10 }} />
                  <Text size="sm" c="dimmed">Veilig & Versleuteld</Text>
                </Group>
              </Stack>
  
              {/* Rechterkant: Abstracte Gradient Afbeelding */}
              {/* De foto is vervangen door een sfeervol verloop dat past bij de huisstijl */}
              <Card padding={0} radius="lg" shadow="xl" style={{ overflow: 'hidden', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box 
                    style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      right: 0, 
                      bottom: 0, 
                      background: 'linear-gradient(135deg, #20c997 0%, #087f5b 100%)', // Teal verloop
                      opacity: 0.9 
                    }} 
                  />
                  {/* Decoratief icoon in het midden voor visuele interesse */}
                  <IconChartPie3 size={120} color="white" style={{ zIndex: 1, opacity: 0.2 }} />
              </Card>
            </SimpleGrid>
          </Container>
        </div>
  
        {/* --- FEATURES SECTIE --- */}
        <Container size="lg" py={80}>
          <Title order={2} ta="center" mb={60}>De kracht van weten</Title>
          
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={40}>
            <FeatureCard 
              icon={IconChartPie3} 
              title="Helder Overzicht" 
              description="Wij ordenen je cijfers. Zie direct waar je geld naartoe gaat."
            />
            <FeatureCard 
              icon={IconCoin} 
              title="Slimme Doelen" 
              description="Stel doelen en beheer je budget. Wij helpen je bewust te besparen."
            />
            <FeatureCard 
              icon={IconLock} 
              title="Veilig & Privé" 
              description="Eerlijk en transparant. Jouw data blijft altijd van jou."
            />
          </SimpleGrid>
        </Container>
  
        {/* --- EXTRA 'GIDS' SECTIE --- */}
        <Container size="lg" py={60} mb={60}>
          <Card withBorder radius="lg" padding={0} shadow="sm">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={0}>
               {/* Linkerkant: Gradient Vlak (vervanging voor de foto) */}
               <Box 
                  style={{ 
                    background: 'linear-gradient(45deg, #63E6BE 0%, #20c997 100%)', // Lichtere teal/mint mix
                    minHeight: '300px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
               >
                  {/* Subtiel patroon of icoon */}
                  <IconCoin size={100} color="white" style={{ opacity: 0.3 }} />
               </Box>
               
               {/* Tekst rechts */}
               <Stack justify="center" p={50} bg="gray.0">
                  <ThemeIcon size={50} radius="md" variant="white" color="teal">
                    <IconCoin style={{ width: rem(30), height: rem(30) }} />
                  </ThemeIcon>
                  <Title order={3}>Jouw gids naar financiële vrijheid</Title>
                  <Text c="dimmed" size="lg">
                    Of je nu spaart voor een huis, een reis of gewoon voor later; Belio geeft je de tools. 
                    Geen ingewikkelde spreadsheets meer, maar een vriendelijke assistent die met je meedenkt.
                  </Text>
                  <Button variant="light" color="teal" mt="md" onClick={() => navigate('/register')}>
                    Maak nu een account aan
                  </Button>
               </Stack>
            </SimpleGrid>
          </Card>
        </Container>
  
        {/* --- FOOTER --- */}
        <Box bg="gray.1" py="xl">
          <Container size="lg" ta="center">
            <Text c="dimmed" size="sm">© 2025 Belio Finance. Alle rechten voorbehouden.</Text>
          </Container>
        </Box>
      </Box>
    );
  }
  
  // Hulponderdeel voor de feature kaarten
  function FeatureCard({ icon: Icon, title, description }) {
    return (
      <Card shadow="sm" padding="xl" radius="md" withBorder style={{ height: '100%' }}>
        <ThemeIcon size={60} radius="md" variant="light" color="teal" mb="lg">
          <Icon style={{ width: rem(32), height: rem(32) }} />
        </ThemeIcon>
        <Text fw={700} size="lg" mb="sm">{title}</Text>
        <Text c="dimmed" size="md" style={{ lineHeight: 1.5 }}>{description}</Text>
      </Card>
    );
  }
  
  export default LandingPage;