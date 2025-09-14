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
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 280,
  },
  wave: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
  },
  content: {
    padding: 30,
    paddingTop: 40,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 5,
  },
  brandTagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  brandLine: {
    width: 40,
    height: 2,
    backgroundColor: '#FF6B6B',
    borderRadius: 1,
  },
  socialSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  socialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  socialLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialButton: {
    marginHorizontal: 8,
  },
  socialButtonGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  socialIcon: {
    width: 20,
    height: 20,
    tintColor: '#FFFFFF',
  },
  quickLinksSection: {
    marginBottom: 25,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  quickLinkText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  chevronIcon: {
    width: 14,
    height: 14,
    tintColor: 'rgba(255, 107, 107, 0.8)',
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 25,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    width: 16,
    height: 16,
    tintColor: 'rgba(255, 107, 107, 0.9)',
    marginRight: 6,
  },
  statText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    marginVertical: 20,
  },
  copyrightSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  copyrightText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  versionText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  loveSection: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loveText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  heartIcon: {
    width: 12,
    height: 12,
    tintColor: '#FF6B6B',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    top: 20,
    right: -20,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(110, 68, 255, 0.1)',
    bottom: 30,
    left: -10,
  },
});

export default Footer;