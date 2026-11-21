/**
 * ProjectStore - Persistencia de proyectos usando IndexedDB
 * ================================================
 *
 * Almacena:
 * - Canciones importadas
 * - Configuraciones de mezcla
 * - Acordes detectados
 * - Markers
 * - Grabaciones
 */

const DB_NAME = 'QuasaricProjects';
const DB_VERSION = 2;
const STORE_PROJECTS = 'projects';
const STORE_MARKERS = 'markers';
const STORE Recordings = 'recordings';

export class ProjectStore {
  constructor() {
    this.db = null;
    this.isOpen = false;
  }

  /**
   * Inicializar la base de datos
   */
  async init() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject({ error: 'IndexedDB no soportado' });
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject({ error: request.error.message });
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isOpen = true;
        resolve({ success: true });
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Store de proyectos
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          const projectStore = db.createObjectStore(STORE_PROJECTS, {
            keyPath: 'id',
            autoIncrement: true
          });
          projectStore.createIndex('name', 'name', { unique: false });
          projectStore.createIndex('createdAt', 'createdAt', { unique: false });
          projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Store de markers
        if (!db.objectStoreNames.contains(STORE_MARKERS)) {
          const markerStore = db.createObjectStore(STORE_MARKERS, {
            keyPath: 'id',
            autoIncrement: true
          });
          markerStore.createIndex('projectId', 'projectId', { unique: false });
        }
      };
    });
  }

  /**
   * Guardar un proyecto
   */
  async saveProject(project) {
    if (!this.isOpen) {
      const result = await this.init();
      if (!result.success) return result;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_PROJECTS], 'readwrite');
      const store = transaction.objectStore(STORE_PROJECTS);

      const projectData = {
        ...project,
        id: project.id || `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: project.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const request = store.put(projectData);

      request.onsuccess = () => {
        resolve({ success: true, id: request.result, project: projectData });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error.message });
      };
    });
  }

  /**
   * Cargar un proyecto
   */
  async loadProject(id) {
    if (!this.isOpen) {
      const result = await this.init();
      if (!result.success) return result;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_PROJECTS], 'readonly');
      const store = transaction.objectStore(STORE_PROJECTS);

      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          resolve({ success: true, project: request.result });
        } else {
          resolve({ success: false, error: 'Proyecto no encontrado' });
        }
      };

      request.onerror = () => {
        reject({ success: false, error: request.error.message });
      };
    });
  }

  /**
   * Listar todos los proyectos
   */
  async listProjects() {
    if (!this.isOpen) {
      const result = await this.init();
      if (!result.success) return result;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_PROJECTS], 'readonly');
      const store = transaction.objectStore(STORE_PROJECTS);

      const request = store.getAll();

      request.onsuccess = () => {
        const projects = request.result.map(p => ({
          id: p.id,
          name: p.name,
          title: p.title,
          artist: p.artist,
          duration: p.duration || (p.lengthSeconds || 0),
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          isFavorite: p.isFavorite || false
        }));
        resolve({ success: true, projects, count: projects.length });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error.message });
      };
    });
  }

  /**
   * Eliminar un proyecto
   */
  async deleteProject(id) {
    if (!this.isOpen) {
      const result = await this.init();
      if (!result.success) return result;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_PROJECTS], 'readwrite');
      const store = transaction.objectStore(STORE_PROJECTS);

      const request = store.delete(id);

      request.onsuccess = () => {
        resolve({ success: true });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error.message });
      };
    });
  }

  /**
   * Buscar proyectos por nombre
   */
  async searchProjects(query) {
    if (!this.isOpen) {
      const result = await this.init();
      if (!result.success) return result;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_PROJECTS], 'readonly');
      const store = transaction.objectStore(STORE_PROJECTS);
      const index = store.index('name');

      const request = index.getAll();

      request.onsuccess = () => {
        const projects = request.result.filter(p =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.title.toLowerCase().includes(query.toLowerCase())
        );
        resolve({ success: true, projects });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error.message });
      };
    });
  }

  /**
   * Guardar markers
   */
  async saveMarkers(projectId, markers) {
    if (!this.isOpen) {
      const result = await this.init();
      if (!result.success) return result;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_MARKERS], 'readwrite');
      const store = transaction.objectStore(STORE_MARKERS);

      markers.forEach(marker => {
        store.put({
          ...marker,
          projectId,
          id: marker.id || `marker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      });

      transaction.oncomplete = () => {
        resolve({ success: true });
      };

      transaction.onerror = () => {
        reject({ success: false, error: transaction.error.message });
      };
    });
  }

  /**
   * Cargar markers de un proyecto
   */
  async loadMarkers(projectId) {
    if (!this.isOpen) {
      const result = await this.init();
      if (!result.success) return result;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_MARKERS], 'readonly');
      const store = transaction.objectStore(STORE_MARKERS);
      const index = store.index('projectId');

      const request = index.getAll(IDBKeyRange.only(projectId));

      request.onsuccess = () => {
        resolve({ success: true, markers: request.result || [] });
      };

      request.onerror = () => {
        reject({ success: false, error: request.error.message });
      };
    });
  }

  /**
   * Exportar proyecto a JSON
   */
  exportProject(project) {
    const exportData = {
      id: project.id,
      name: project.name,
      title: project.title,
      artist: project.artist,
      style: project.style,
      bpm: project.bpm,
      key: project.key,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      stems: project.stems || [],
      markers: project.markers || [],
      userTracks: project.userTracks || [],
      mixSettings: project.mixSettings || {},
      masterSettings: project.masterSettings || {}
    };

    return {
      success: true,
      data: exportData,
      json: JSON.stringify(exportData, null, 2)
    };
  }

  /**
   * Importar proyecto desde JSON
   */
  importProject(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;

      const project = {
        id: data.id,
        name: data.name,
        title: data.title,
        artist: data.artist,
        style: data.style,
        bpm: data.bpm,
        key: data.key,
        createdAt: data.createdAt,
        updatedAt: new Date().toISOString(),
        stems: data.stems || [],
        markers: data.markers || [],
        userTracks: data.userTracks || [],
        mixSettings: data.mixSettings || {},
        masterSettings: data.masterSettings || {}
      };

      return { success: true, project };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Crear backup ZIP
   */
  async createBackup(projectId) {
    const projectResult = await this.loadProject(projectId);
    if (!projectResult.success) return projectResult;

    const markersResult = await this.loadMarkers(projectId);
    if (!markersResult.success) return markersResult;

    const backupData = {
      project: projectResult.project,
      markers: markersResult.markers,
      exportedAt: new Date().toISOString()
    };

    return {
      success: true,
      backup: backupData,
      json: JSON.stringify(backupData, null, 2)
    };
  }

  /**
   * Cerrar la base de datos
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isOpen = false;
    }
  }
}

export default new ProjectStore();