# 🧪 Manual Testing & Edge Case Verification Guide

This guide details how to verify the new concurrency locking mechanisms, version access security patches, magic bytes validator, and rate limiters on Zenith CMS.

---

## 🔒 Test 1: Concurrency Document Locks (Active Lockouts)

### Objective
Verify that the backend actively blocks concurrent database writes if another user is editing the document.

### Steps
1. **Login as User A** (Editor) and obtain an access token.
2. **Login as User B** (Editor) and obtain an access token.
3. **Send Heartbeat for User A**:
   * Send a `POST` request to `/api/v1/presence/heartbeat`:
     ```json
     {
       "collection": "posts",
       "documentId": "post_doc_id_123"
     }
     ```
   * Set the header `Authorization: Bearer <User_A_Token>`.
4. **Attempt Write as User B**:
   * Send a `PUT` request to `/api/v1/posts/post_doc_id_123` with the header `Authorization: Bearer <User_B_Token>`.
5. **Expected Result**:
   * The API returns a `400/409 Conflict` error stating:
     `[Zenith] Conflict: Document is currently locked for editing by: <User_A_Email>`.
6. **Test Force Override**:
   * Send the same `PUT` request as User B, but include `"overrideLock": true` in the request body.
   * The write should succeed.

---

## 🛡️ Test 2: Version Restore & Rollback Access Security

### Objective
Verify that users cannot bypass RLS/RBAC constraints by invoking historical version restores.

### Steps
1. **Login as User C** (Viewer role) and obtain an access token.
2. **Retrieve Version Details**:
   * Send a `GET` request to `/api/v1/versions/posts/post_doc_id_123` with the header `Authorization: Bearer <User_C_Token>`.
   * Verify if the endpoint returns a `403 Forbidden` error (since viewers cannot read private draft content restricted by RLS).
3. **Attempt Version Restore**:
   * Send a `POST` request to `/api/v1/versions/posts/post_doc_id_123/version_xyz_999/restore` with the header `Authorization: Bearer <User_C_Token>`.
4. **Expected Result**:
   * The API returns a `403 Forbidden` error because version restore operations now route through the Local API pipeline, which enforces access controls.

---

## 📁 Test 3: Magic Bytes Upload Validation

### Objective
Verify that malicious file upload extension spoofing is blocked by byte signature checks.

### Steps
1. **Prepare Spoofed File**:
   * Create a text file containing JavaScript: `console.log("exploit");`.
   * Rename the file to `avatar.png`.
2. **Attempt Upload**:
   * Send a `POST` request to `/api/v1/upload` using `multipart/form-data`.
   * Add the file parameter with filename `avatar.png` and mimetype header `image/png`.
3. **Expected Result**:
   * The API returns a `400 Bad Request` error stating:
     `File content signature does not match the stated mimetype "image/png"`.
   * Verify that the file was deleted from the server temp directory.

---

## ⚡ Test 4: Rate Limiting & DoS Protection

### Objective
Verify that IP rate limiting blocks brute-force authentication.

### Steps
1. **Trigger Limiter**:
   * Send 11 rapid requests to `/api/v1/auth/login` (or `/api/v1/auth/register`) from a script or postman runner.
2. **Expected Result**:
   * The 11th request returns a `429 Too Many Requests` error stating:
     `Too many login attempts. Please wait 15 minutes.`
