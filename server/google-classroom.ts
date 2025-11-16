import { google } from 'googleapis';
import type { Profile } from '@shared/schema';

const classroom = google.classroom('v1');

/**
 * Get OAuth2 client with user's access token
 */
function getOAuth2Client(user: Profile) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  if (!user.googleAccessToken) {
    throw new Error('User does not have Google access token');
  }

  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken,
  });

  return oauth2Client;
}

/**
 * List all courses the user teaches
 */
export async function listTeacherCourses(user: Profile) {
  try {
    const auth = getOAuth2Client(user);
    
    const response = await classroom.courses.list({
      auth,
      teacherId: 'me',
      courseStates: ['ACTIVE'],
      pageSize: 100,
    });

    return response.data.courses || [];
  } catch (error: any) {
    console.error('Error listing courses:', error.message);
    throw new Error(`Failed to list courses: ${error.message}`);
  }
}

/**
 * Share content to Google Classroom as a coursework assignment
 */
export async function shareToClassroom(
  user: Profile,
  courseId: string,
  title: string,
  description: string,
  materialLink: string,
  dueDate?: { year: number; month: number; day: number },
  dueTime?: { hours: number; minutes: number }
) {
  try {
    const auth = getOAuth2Client(user);

    // Create coursework (assignment)
    const coursework: any = {
      title,
      description,
      materials: [
        {
          link: {
            url: materialLink,
            title: title,
          },
        },
      ],
      state: 'PUBLISHED',
      workType: 'ASSIGNMENT',
    };

    // Add due date/time if provided
    if (dueDate) {
      coursework.dueDate = dueDate;
      if (dueTime) {
        coursework.dueTime = dueTime;
      }
    }

    const response = await classroom.courses.courseWork.create({
      auth,
      courseId,
      requestBody: coursework,
    });

    return response.data;
  } catch (error: any) {
    console.error('Error sharing to classroom:', error.message);
    throw new Error(`Failed to share to classroom: ${error.message}`);
  }
}

/**
 * Post an announcement to Google Classroom (no assignment, just info)
 */
export async function postAnnouncement(
  user: Profile,
  courseId: string,
  text: string,
  materialLink?: string,
  materialTitle?: string
) {
  try {
    const auth = getOAuth2Client(user);

    const announcement: any = {
      text,
      state: 'PUBLISHED',
    };

    // Add material link if provided
    if (materialLink) {
      announcement.materials = [
        {
          link: {
            url: materialLink,
            title: materialTitle || 'Link',
          },
        },
      ];
    }

    const response = await classroom.courses.announcements.create({
      auth,
      courseId,
      requestBody: announcement,
    });

    return response.data;
  } catch (error: any) {
    console.error('Error posting announcement:', error.message);
    throw new Error(`Failed to post announcement: ${error.message}`);
  }
}
