# Virtual Cinema Todo List

## Session Management Improvements
- [x] Add "Leave Session" button in the sidebar
- [ ] Implement cleanup function to remove data older than 5 seconds in realtime database
- [ ] Automatically mark participants inactive after 30 seconds of inactivity
- [ ] Fix session propagation to ensure user documents are properly updated
- [ ] Add a "catch up" button for lagging users to synchronize with the session
- [ ] Remove realtime session data when session is deleted

## UI Improvements
- [ ] Improve video player synchronization UI
- [ ] Add visual indicator for lagging users
- [ ] Create confirmation dialog for leaving a session

## Realtime Synchronization
- [ ] Implement efficient buffering mechanism for video syncing
- [ ] Fix video sync issues between participants
- [ ] Add participant status indicators (active/inactive)

## Error Handling
- [ ] Add better error handling for session operations
- [ ] Implement proper retry mechanisms for failed operations

## Completed Tasks
- [x] Automatically send the attendee to join the current video if it is playing.
- [x] Do not subscribe to the realtime db instead just fetch the doc once, and redirect.
- [x] The current video can only be set by the group moderator, i.e. if group moderator goes to search a video or changes the video other members will follow. Sync the user data using the realtime db other user times + events from that time onwards
- [x] Remove participants when they leave by clicking the button in the sidebar(Add the Button)
- [x] Add cleanup function to reduce the unnecessary data from realtime db, say data older than 5 seconds for current session.
- [x] Remove current seesion from realtime db when it is removed.
- [x] in the app side bar add buttons for copy invite like that is the session id
- [x] if moderator a search icon button that will terminate the video from after a confirmation popup
- [x] When a video is removed from the current session make it null in the realtime db and remove it from all the participants user objects session, show a notificaion popup with confirm that the moderator has removed the video from the session.
- [x] On video termination, all users are taken to the search page again.
- [x] Other users are not allowed to search for videos, only the moderator can search for videos and change the video.
- [x] Allow non-moderator users to leave the session. by an icon button in the sidebar.
- [x] Add cleanup function for realtime DB data older than 5 seconds
- [x] Remove current session from realtime DB when it's removed
- [x] Allow users to leave session via sidebar button
- [x] Add confirmation dialog for moderator video termination
- [x] Restrict video searching to session moderators only