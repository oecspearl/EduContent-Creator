/**
 * Google Slides API service for creating presentations
 */

import { google } from 'googleapis';
import type { Profile } from '@shared/schema';
import { storage } from './storage';

const slides = google.slides('v1');

/**
 * Get OAuth2 client for a user
 */
async function getOAuth2Client(user: Profile) {
  if (!user.googleAccessToken || !user.googleRefreshToken) {
    throw new Error('User has not connected their Google account with Slides API access');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/api/auth/google/callback`
  );

  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
    expiry_date: user.googleTokenExpiry ? new Date(user.googleTokenExpiry).getTime() : undefined,
  });

  // Refresh token if expired
  if (user.googleTokenExpiry && new Date(user.googleTokenExpiry) < new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    await storage.updateProfile(user.id, {
      googleAccessToken: credentials.access_token || user.googleAccessToken,
      googleTokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : user.googleTokenExpiry,
    });
    oauth2Client.setCredentials(credentials);
  }

  return oauth2Client;
}

export interface SlideContent {
  type: 'title' | 'content' | 'image' | 'questions';
  title?: string;
  subtitle?: string;
  text?: string;
  bulletPoints?: string[];
  imageUrl?: string;
  imageAlt?: string;
  imageAttribution?: string;
  questions?: string[];
  notes?: string;
}

/**
 * Create a new Google Slides presentation
 */
export async function createPresentation(
  user: Profile,
  title: string
): Promise<{ presentationId: string; url: string }> {
  const auth = await getOAuth2Client(user);

  const response = await slides.presentations.create({
    auth,
    requestBody: {
      title,
    },
  });

  const presentationId = response.data.presentationId!;
  const url = `https://docs.google.com/presentation/d/${presentationId}/edit`;

  return { presentationId, url };
}

/**
 * Add slides to a presentation
 */
export async function addSlidesToPresentation(
  user: Profile,
  presentationId: string,
  slideContents: SlideContent[]
): Promise<void> {
  const auth = await getOAuth2Client(user);

  // Get presentation to find the first slide ID
  const presentation = await slides.presentations.get({
    auth,
    presentationId,
  });

  const firstSlideId = presentation.data.slides?.[0]?.objectId;
  const requests: any[] = [];

  // Delete the default blank slide if it exists
  if (firstSlideId) {
    requests.push({
      deleteObject: {
        objectId: firstSlideId,
      },
    });
  }

  // Create slides
  slideContents.forEach((content, index) => {
    const slideId = `slide_${index}`;
    
    // Create blank slide
    requests.push({
      createSlide: {
        objectId: slideId,
        insertionIndex: index,
        slideLayoutReference: {
          predefinedLayout: 'BLANK',
        },
      },
    });

    // Add title
    if (content.title) {
      const titleBoxId = `title_${index}`;
      requests.push({
        createShape: {
          objectId: titleBoxId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              height: { magnitude: 700000, unit: 'EMU' },
              width: { magnitude: 8000000, unit: 'EMU' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 500000,
              translateY: 500000,
              unit: 'EMU',
            },
          },
        },
      });

      requests.push({
        insertText: {
          objectId: titleBoxId,
          text: content.title,
        },
      });

      requests.push({
        updateTextStyle: {
          objectId: titleBoxId,
          style: {
            fontSize: { magnitude: 36, unit: 'PT' },
            bold: true,
          },
          fields: 'fontSize,bold',
        },
      });
    }

    // Add subtitle
    if (content.subtitle) {
      const subtitleBoxId = `subtitle_${index}`;
      requests.push({
        createShape: {
          objectId: subtitleBoxId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              height: { magnitude: 500000, unit: 'EMU' },
              width: { magnitude: 8000000, unit: 'EMU' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 500000,
              translateY: 1500000,
              unit: 'EMU',
            },
          },
        },
      });

      requests.push({
        insertText: {
          objectId: subtitleBoxId,
          text: content.subtitle,
        },
      });

      requests.push({
        updateTextStyle: {
          objectId: subtitleBoxId,
          style: {
            fontSize: { magnitude: 20, unit: 'PT' },
          },
          fields: 'fontSize',
        },
      });
    }

    // Add text content
    if (content.text) {
      const textBoxId = `text_${index}`;
      const yPosition = content.title ? 1500000 : 800000;
      
      requests.push({
        createShape: {
          objectId: textBoxId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              height: { magnitude: 3000000, unit: 'EMU' },
              width: { magnitude: 8000000, unit: 'EMU' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 500000,
              translateY: yPosition,
              unit: 'EMU',
            },
          },
        },
      });

      requests.push({
        insertText: {
          objectId: textBoxId,
          text: content.text,
        },
      });

      requests.push({
        updateTextStyle: {
          objectId: textBoxId,
          style: {
            fontSize: { magnitude: 16, unit: 'PT' },
          },
          fields: 'fontSize',
        },
      });
    }

    // Add bullet points
    if (content.bulletPoints && content.bulletPoints.length > 0) {
      const bulletBoxId = `bullets_${index}`;
      const yPosition = content.title ? 1500000 : 800000;
      
      requests.push({
        createShape: {
          objectId: bulletBoxId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              height: { magnitude: 3000000, unit: 'EMU' },
              width: { magnitude: 8000000, unit: 'EMU' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 500000,
              translateY: yPosition,
              unit: 'EMU',
            },
          },
        },
      });

      const bulletText = content.bulletPoints.map(point => `• ${point}`).join('\n');
      requests.push({
        insertText: {
          objectId: bulletBoxId,
          text: bulletText,
        },
      });

      requests.push({
        updateTextStyle: {
          objectId: bulletBoxId,
          style: {
            fontSize: { magnitude: 18, unit: 'PT' },
          },
          fields: 'fontSize',
        },
      });
    }

    // Add questions
    if (content.questions && content.questions.length > 0) {
      const questionsBoxId = `questions_${index}`;
      const yPosition = content.title ? 1500000 : 800000;
      
      requests.push({
        createShape: {
          objectId: questionsBoxId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              height: { magnitude: 3500000, unit: 'EMU' },
              width: { magnitude: 8000000, unit: 'EMU' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 500000,
              translateY: yPosition,
              unit: 'EMU',
            },
          },
        },
      });

      const questionsText = content.questions.map((q, i) => `${i + 1}. ${q}`).join('\n\n');
      requests.push({
        insertText: {
          objectId: questionsBoxId,
          text: questionsText,
        },
      });

      requests.push({
        updateTextStyle: {
          objectId: questionsBoxId,
          style: {
            fontSize: { magnitude: 16, unit: 'PT' },
          },
          fields: 'fontSize',
        },
      });
    }

    // Add image (if URL is publicly accessible)
    if (content.imageUrl) {
      requests.push({
        createImage: {
          url: content.imageUrl,
          elementProperties: {
            pageObjectId: slideId,
            size: {
              height: { magnitude: 3000000, unit: 'EMU' },
              width: { magnitude: 4000000, unit: 'EMU' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 2500000,
              translateY: 1500000,
              unit: 'EMU',
            },
          },
        },
      });
    }

    // Add speaker notes
    if (content.notes) {
      requests.push({
        createSpeakerSpotlight: {
          pageObjectId: slideId,
          speakerSpotlightProperties: {
            outline: {
              outlineFill: {
                solidFill: {
                  color: {
                    rgbColor: { red: 0, green: 0, blue: 0 },
                  },
                },
              },
            },
          },
        },
      });
    }
  });

  // Execute all requests in batches of 100 (API limit)
  const batchSize = 100;
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    await slides.presentations.batchUpdate({
      auth,
      presentationId,
      requestBody: {
        requests: batch,
      },
    });
  }
}
