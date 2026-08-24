"use client";

import { useState, useEffect } from "react";

function UploadForm({ onUploadSuccess }) {
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [course, setCourse] = useState('');
  const [unit, setUnit] = useState('');
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  async function uploadFile(e) {
    e.preventDefault();

    if (!name || !subject || !course || !unit || !file) {
      return setMessage("Please fill all fields and select a file");
    }

    if (file.size > 5 * 1024 * 1024) {
      return setMessage("File size must be less than 5MB");
    }

    setIsUploading(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('subject', subject);
      formData.append('unit', Number(unit));
      formData.append('course', course);
      formData.append('file', file);

      const response = await fetch('/api', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ File uploaded successfully!');
        setName('');
        setSubject('');
        setCourse('');
        setUnit('');
        setFile(null);
        const fileInput = document.querySelector('.file');
        if (fileInput) fileInput.value = '';
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setMessage(`❌ ${data.message || 'Upload failed'}`);
      }
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="cont">
      <h1>Upload Notes</h1>
      <h3 className="msg">{message}</h3>

      <input
        type="text"
        value={name}
        placeholder="Enter name"
        className="inpName"
        onChange={(e) => setName(e.target.value)}
      />

      <input
        type="text"
        value={subject}
        className="subject"
        placeholder="Enter subject"
        onChange={(e) => setSubject(e.target.value)}
      />

      <input
        type="number"
        value={unit}
        placeholder="Enter unit"
        className="unit"
        onChange={(e) => setUnit(e.target.value)}
      />

      <input
        type="text"
        value={course}
        placeholder="Enter course"
        className="course"
        onChange={(e) => setCourse(e.target.value)}
      />

      <input
        type="file"
        placeholder="Upload file"
        className="file"
        onChange={(e) => setFile(e.target.files[0])}
        accept=".pdf,.doc,.docx,image/*"
      />

      <button onClick={uploadFile} disabled={isUploading}>
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
}

export default function Home() {
  const [fetchedData, setFetchedData] = useState([]);
  const [uploadWindow, setUploadWindow] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api');
      if (!response.ok) {
        throw new Error("Error while fetching");
      }
      const data = await response.json();
      setFetchedData(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ✅ DOWNLOAD FUNCTION
  const handleDownload = async (note) => {
    // ✅ Simple - just use the fileUrl from your database
    const fileUrl = note.fileUrl;
    const fileName = note.originalFileName || `${note.Name || note.name}.pdf`;

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Failed to download');
      }

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    }
  };

  const handleDelete = async (noteId, publicId, resourceType = 'auto') => {
    let inp = prompt("enter password: ")
    if (inp !== "delete1234") {
      return;
    }

    setDeletingId(noteId);

    try {
      const response = await fetch(`/api/${noteId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          publicId: publicId,
          resourceType: resourceType
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Error deleting file");
      }

      setFetchedData(prevData => prevData.filter(note => note._id !== noteId));

    } catch (err) {
      console.error(err);
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Helper function to get file extension and icon
  const getFileInfo = (fileUrl) => {
    if (!fileUrl) return { extension: 'file', icon: '📄' };

    const extension = fileUrl.split('.').pop().toLowerCase();
    const icons = {
      'pdf': '📕',
      'doc': '📘',
      'docx': '📘',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'mp4': '🎬',
      'mp3': '🎵',
      'zip': '📦',
      'txt': '📝'
    };

    return {
      extension,
      icon: icons[extension] || '📄'
    };
  };

  return (
    <>
      <div className="box">
        <div className="uploadbox">
          <button onClick={() => setUploadWindow(!uploadWindow)}>
            {uploadWindow ? 'Close' : 'Upload File'}
          </button>
        </div>

        <div>
          {uploadWindow && <UploadForm onUploadSuccess={fetchData} />}
        </div>

        {isLoading ? (
          <p>Loading...</p>
        ) : fetchedData.length > 0 ? (
          <div className="notes-list-horizontal">
            {fetchedData.map((note) => {
              const fileInfo = getFileInfo(note.fileUrl);
              return (
                <div key={note._id} className="note-item-horizontal">
                  <div className="note-icon">{fileInfo.icon}</div>
                  <div className="note-content-horizontal">
                    <h3>{note.Name || note.name}</h3>
                    <div className="note-details">
                      <span className="detail-tag">📚 {note.subject}</span>
                      <span className="detail-tag">🎓 {note.course}</span>
                      <span className="detail-tag">📖 Unit {note.unit}</span>
                      <span className="detail-tag file-type">{fileInfo.extension.toUpperCase()}</span>
                    </div>
                    <div className="note-actions-horizontal">
                      {note.fileUrl && (
                        <button
                          onClick={() => handleDownload(note)}  // ✅ Pass the whole note
                          className="download-btn"
                        >
                          ⬇️ Download
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(note._id, note.publicId)}
                        disabled={deletingId === note._id}
                        className="delete-btn-horizontal"
                      >
                        {deletingId === note._id ? 'Deleting...' : '🗑️ Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p>No notes found</p>
        )}
      </div>
    </>
  );
}
