import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashOverlayProps {
    visible: boolean;
    onFinish?: () => void;
}

export const SplashOverlay: React.FC<SplashOverlayProps> = ({ visible, onFinish }) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        if (visible) {
            // reset values
            opacity.setValue(0);
            scale.setValue(0.8);

            Animated.parallel([
                // Fade In & Out Sequence
                Animated.sequence([
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.delay(1200), // Show for 1.2 second
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]),
                // Scale Animation
                Animated.sequence([
                    Animated.spring(scale, {
                        toValue: 1.1,
                        friction: 3,
                        tension: 40,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scale, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    })
                ])
            ]).start(() => {
                if (onFinish) onFinish();
            });
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, { opacity }]}>
            <Animated.Image
                source={require('../assets/images/splash-icon.png')}
                style={[styles.logo, { transform: [{ scale }] }]}
                resizeMode="contain"
            />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999, // Ensure it sits on top of everything
        elevation: 10,
    },
    logo: {
        width: width * 0.35,
        height: width * 0.35,
    },
});
