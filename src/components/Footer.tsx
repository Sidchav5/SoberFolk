// ===== src/components/Footer.tsx =====
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface SocialLink {
  icon: string;
  url: string;
}

interface QuickLink {
  title: string;
  url: string;
}

const Footer: React.FC = () => {
  const socialLinks: SocialLink[] = [
    { 
      icon: 'https://cdn-icons-png.flaticon.com/512/733/733579.png', // Twitter/X
      url: 'https://twitter.com/soberfolks' 
    },
    { 
      icon: 'https://cdn-icons-png.flaticon.com/512/733/733547.png', // Facebook
      url: 'https://facebook.com/soberfolks' 
    },
    { 
      icon: 'https://cdn-icons-png.flaticon.com/512/732/732200.png', // Email
      url: 'mailto:hello@soberfolks.com' 
    },
  ];

  const quickLinks: QuickLink[] = [
    { title: 'Privacy Policy', url: '#' },
    { title: 'Terms of Service', url: '#' },
    { title: 'Support', url: '#' },
  ];

  const handleLinkPress = (url: string): void => {
    if (url.startsWith('http') || url.startsWith('mailto')) {
      Linking.openURL(url);
    }
  };

  return (
    <LinearGradient 
      colors={['#000000', '#222222', '#6E44FF']} 
      start={{x: 0, y: 0}} 
      end={{x: 1, y: 1}}
      style={styles.container}
    >
      <View style={styles.wave} />

      <View style={styles.content}>
        <View style={styles.brandSection}>
          <Text style={styles.brandName}>SoberFolks</Text>
          <Text style={styles.brandTagline}>Your journey to wellness</Text>
          <View style={styles.brandLine} />
        </View>

        <View style={styles.socialSection}>
          <Text style={styles.socialTitle}>Connect With Us</Text>
          <View style={styles.socialLinks}>
            {socialLinks.map((social, index) => (
              <TouchableOpacity
                key={index}
                style={styles.socialButton}
                onPress={() => handleLinkPress(social.url)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(255, 107, 107, 0.3)', 'rgba(110, 68, 255, 0.1)']}
                  style={styles.socialButtonGradient}
                >
                  <Image 
                    source={{ uri: social.icon }} 
                    style={styles.socialIcon}
                    resizeMode="contain"
                  />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.quickLinksSection}>
          {quickLinks.map((link, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleLinkPress(link.url)}
              style={styles.quickLink}
              activeOpacity={0.7}
            >
              <Text style={styles.quickLinkText}>{link.title}</Text>
              <Image 
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/271/271226.png' }}
                style={styles.chevronIcon}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Image 
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' }}
              style={styles.statIcon}
              resizeMode="contain"
            />
            <Text style={styles.statText}>10K+ Active Users</Text>
          </View>
          <View style={styles.statItem}>
            <Image 
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/833/833472.png' }}
              style={styles.statIcon}
              resizeMode="contain"
            />
            <Text style={styles.statText}>99% Success Stories</Text>
          </View>
        </View> */}

        <View style={styles.divider} />

        <View style={styles.copyrightSection}>
          <Text style={styles.copyrightText}>
            © 2025 SoberFolks. All Rights Reserved.
          </Text>
          <Text style={styles.versionText}>v2.1.0</Text>
        </View>

        <View style={styles.loveSection}>
          {/* <Text style={styles.loveText}>Made with </Text>
          <Image 
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/833/833472.png' }}
            style={styles.heartIcon}
            resizeMode="contain"
          />
          <Text style={styles.loveText}> for your wellness journey</Text> */}
        </View>
      </View>

      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 320,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  wave: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  content: {
    padding: 32,
    paddingTop: 44,
    paddingBottom: 36,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brandName: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  brandTagline: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.88)',
    fontStyle: 'italic',
    marginBottom: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  brandLine: {
    width: 60,
    height: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  socialSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  socialTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 18,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  socialLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  socialButton: {
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  socialButtonGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 107, 0.4)',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  socialIcon: {
    width: 24,
    height: 24,
    tintColor: '#FFFFFF',
  },
  quickLinksSection: {
    marginBottom: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  quickLinkText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  chevronIcon: {
    width: 16,
    height: 16,
    tintColor: 'rgba(255, 107, 107, 0.9)',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  statIcon: {
    width: 18,
    height: 18,
    tintColor: 'rgba(255, 107, 107, 0.95)',
    marginRight: 8,
  },
  statText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1.5,
    backgroundColor: 'rgba(255, 107, 107, 0.25)',
    marginVertical: 24,
    borderRadius: 1,
  },
  copyrightSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  copyrightText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  loveSection: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  loveText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  heartIcon: {
    width: 14,
    height: 14,
    tintColor: '#FF6B6B',
    marginHorizontal: 2,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
    top: 10,
    right: -40,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(110, 68, 255, 0.12)',
    bottom: 20,
    left: -30,
    shadowColor: '#6E44FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
});

export default Footer;