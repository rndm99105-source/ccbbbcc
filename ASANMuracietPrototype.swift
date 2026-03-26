import SwiftUI
import PhotosUI
import CoreLocation

// MARK: - Domain Models

enum AppealType: String, CaseIterable, Codable, Identifiable {
    case complaint = "Şikayət"
    case suggestion = "Təklif"
    case thanks = "Təşəkkür"
    case inquiry = "Sorğu"

    var id: String { rawValue }
}

enum AppealCategory: String, CaseIterable, Codable, Identifiable {
    case utilities = "Kommunal"
    case roadTransport = "Yol və nəqliyyat"
    case infrastructure = "İnfrastruktur"
    case environment = "Ətraf mühit"
    case social = "Sosial"
    case other = "Digər"

    var id: String { rawValue }
}

enum PriorityLevel: String, CaseIterable, Codable, Identifiable {
    case urgent = "Təcili"
    case medium = "Orta"
    case low = "Aşağı"

    var id: String { rawValue }

    var color: Color {
        switch self {
        case .urgent: return .red
        case .medium: return .orange
        case .low: return .green
        }
    }
}

struct Appeal: Identifiable, Codable {
    let id: UUID
    let createdAt: Date
    var title: String
    var description: String
    var type: AppealType
    var category: AppealCategory
    var priority: PriorityLevel
    var locationText: String
    var latitude: Double?
    var longitude: Double?
    var citizenMediaURL: URL?
    var authorityMediaURL: URL?
    var processingStatus: String
    var similarityScore: Double?

    init(
        id: UUID = UUID(),
        createdAt: Date = Date(),
        title: String,
        description: String,
        type: AppealType,
        category: AppealCategory,
        priority: PriorityLevel,
        locationText: String,
        latitude: Double? = nil,
        longitude: Double? = nil,
        citizenMediaURL: URL? = nil,
        authorityMediaURL: URL? = nil,
        processingStatus: String = "Yeni",
        similarityScore: Double? = nil
    ) {
        self.id = id
        self.createdAt = createdAt
        self.title = title
        self.description = description
        self.type = type
        self.category = category
        self.priority = priority
        self.locationText = locationText
        self.latitude = latitude
        self.longitude = longitude
        self.citizenMediaURL = citizenMediaURL
        self.authorityMediaURL = authorityMediaURL
        self.processingStatus = processingStatus
        self.similarityScore = similarityScore
    }
}

struct AIAnalysisResult: Codable {
    let generatedDescription: String
    let category: AppealCategory
    let priority: PriorityLevel
    let detectedObjects: [String]
    let confidence: Double
}

struct VisualVerificationResult: Codable {
    let isSameLocation: Bool
    let issueResolved: Bool
    let similarityScore: Double
    let warningMessage: String?
}

// MARK: - API Contracts

protocol ASANAPIProtocol {
    func analyzeMedia(fileData: Data, mimeType: String, location: CLLocation?) async throws -> AIAnalysisResult
    func createAppeal(_ appeal: Appeal) async throws -> Appeal
    func verifyResult(beforeData: Data, afterData: Data) async throws -> VisualVerificationResult
}

final class ASANAPIMockService: ASANAPIProtocol {
    func analyzeMedia(fileData: Data, mimeType: String, location: CLLocation?) async throws -> AIAnalysisResult {
        try await Task.sleep(nanoseconds: 900_000_000)
        return AIAnalysisResult(
            generatedDescription: "Yolda iri çuxur müşahidə olunur, nəqliyyat üçün təhlükə yaradır.",
            category: .roadTransport,
            priority: .urgent,
            detectedObjects: ["çuxur", "asfalt", "avtomobil yolu"],
            confidence: 0.93
        )
    }

    func createAppeal(_ appeal: Appeal) async throws -> Appeal {
        try await Task.sleep(nanoseconds: 300_000_000)
        return appeal
    }

    func verifyResult(beforeData: Data, afterData: Data) async throws -> VisualVerificationResult {
        try await Task.sleep(nanoseconds: 800_000_000)
        return VisualVerificationResult(
            isSameLocation: true,
            issueResolved: false,
            similarityScore: 0.42,
            warningMessage: "Uyğunsuzluq: problem tam aradan qaldırılmayıb və ya fərqli görüntü yüklənib."
        )
    }
}

// MARK: - ViewModel

@MainActor
final class AppealViewModel: ObservableObject {
    @Published var title: String = ""
    @Published var manualDescription: String = ""
    @Published var generatedDescription: String = ""
    @Published var selectedType: AppealType = .complaint
    @Published var selectedCategory: AppealCategory = .other
    @Published var selectedPriority: PriorityLevel = .medium
    @Published var locationText: String = ""
    @Published var pickedItem: PhotosPickerItem?
    @Published var mediaData: Data?
    @Published var detectedObjects: [String] = []

    @Published var isLoading: Bool = false
    @Published var alertText: String?

    @Published var appeals: [Appeal] = []

    private let api: ASANAPIProtocol

    init(api: ASANAPIProtocol = ASANAPIMockService()) {
        self.api = api
    }

    func loadPickedMedia() async {
        guard let pickedItem else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            if let data = try await pickedItem.loadTransferable(type: Data.self) {
                mediaData = data
                let result = try await api.analyzeMedia(fileData: data, mimeType: "image/jpeg", location: nil)
                generatedDescription = result.generatedDescription
                selectedCategory = result.category
                selectedPriority = result.priority
                detectedObjects = result.detectedObjects
            }
        } catch {
            alertText = "Media analiz edilə bilmədi: \(error.localizedDescription)"
        }
    }

    func submitAppeal() async {
        guard !title.isEmpty else {
            alertText = "Başlıq daxil edin."
            return
        }

        let finalDescription = manualDescription.isEmpty ? generatedDescription : manualDescription
        guard !finalDescription.isEmpty else {
            alertText = "Təsvir boş ola bilməz."
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let draft = Appeal(
                title: title,
                description: finalDescription,
                type: selectedType,
                category: selectedCategory,
                priority: selectedPriority,
                locationText: locationText,
                citizenMediaURL: nil,
                processingStatus: "Qəbul edildi"
            )

            let created = try await api.createAppeal(draft)
            appeals.insert(created, at: 0)
            resetForm()
            alertText = "Müraciət uğurla göndərildi."
        } catch {
            alertText = "Müraciət göndərilmədi: \(error.localizedDescription)"
        }
    }

    func verifyExecutionForFirstAppeal(with authorityData: Data) async {
        guard let firstIndex = appeals.indices.first,
              let before = mediaData else {
            alertText = "Yoxlama üçün ilkin media tapılmadı."
            return
        }

        isLoading = true
        defer { isLoading = false }

        do {
            let result = try await api.verifyResult(beforeData: before, afterData: authorityData)
            appeals[firstIndex].similarityScore = result.similarityScore
            appeals[firstIndex].processingStatus = result.issueResolved ? "Bağlandı" : "Təkrar baxış"

            if let warning = result.warningMessage {
                alertText = warning
            } else {
                alertText = "Vizual uyğunluq təsdiqləndi."
            }
        } catch {
            alertText = "Yoxlama zamanı xəta baş verdi: \(error.localizedDescription)"
        }
    }

    private func resetForm() {
        title = ""
        manualDescription = ""
        generatedDescription = ""
        selectedType = .complaint
        selectedCategory = .other
        selectedPriority = .medium
        locationText = ""
        pickedItem = nil
        mediaData = nil
        detectedObjects = []
    }
}

// MARK: - SwiftUI Screens

struct ASANMuracietHomeView: View {
    @StateObject private var vm = AppealViewModel()

    var body: some View {
        NavigationStack {
            Form {
                Section("Müraciət məlumatları") {
                    TextField("Başlıq", text: $vm.title)
                    Picker("Növ", selection: $vm.selectedType) {
                        ForEach(AppealType.allCases) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }

                    TextField("Məkan (ünvan/GPS)", text: $vm.locationText)
                }

                Section("Vizual material") {
                    PhotosPicker(selection: $vm.pickedItem, matching: .images) {
                        Label("Şəkil seç", systemImage: "photo")
                    }
                    .onChange(of: vm.pickedItem) { _, _ in
                        Task { await vm.loadPickedMedia() }
                    }

                    if !vm.detectedObjects.isEmpty {
                        Text("Aşkarlanan obyektlər: \(vm.detectedObjects.joined(separator: ", "))")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("AI nəticəsi") {
                    TextEditor(text: Binding(
                        get: { vm.generatedDescription.isEmpty ? vm.manualDescription : vm.generatedDescription },
                        set: { vm.manualDescription = $0 }
                    ))
                    .frame(minHeight: 110)

                    Picker("Kateqoriya", selection: $vm.selectedCategory) {
                        ForEach(AppealCategory.allCases) { category in
                            Text(category.rawValue).tag(category)
                        }
                    }

                    Picker("Prioritet", selection: $vm.selectedPriority) {
                        ForEach(PriorityLevel.allCases) { p in
                            Text(p.rawValue).tag(p)
                        }
                    }
                }

                Section {
                    Button {
                        Task { await vm.submitAppeal() }
                    } label: {
                        HStack {
                            Spacer()
                            Text("Müraciəti göndər")
                            Spacer()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                }

                Section("Müraciətlərim") {
                    if vm.appeals.isEmpty {
                        Text("Hələ müraciət yoxdur")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(vm.appeals) { appeal in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(appeal.title).font(.headline)
                                Text("\(appeal.category.rawValue) • \(appeal.priority.rawValue)")
                                    .font(.subheadline)
                                Text("Status: \(appeal.processingStatus)")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                                if let score = appeal.similarityScore {
                                    Text(String(format: "Vizual uyğunluq: %.0f%%", score * 100))
                                        .font(.footnote)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }

                if let first = vm.appeals.first {
                    Section("İcra nəticəsinin yoxlanması") {
                        Text("Son müraciət: \(first.title)")
                            .font(.footnote)
                        Button("Demo yoxlama apar") {
                            Task {
                                let fakeAuthorityImage = Data(repeating: 1, count: 256)
                                await vm.verifyExecutionForFirstAppeal(with: fakeAuthorityImage)
                            }
                        }
                    }
                }
            }
            .navigationTitle("ASAN müraciət")
            .overlay {
                if vm.isLoading {
                    ZStack {
                        Color.black.opacity(0.1).ignoresSafeArea()
                        ProgressView("Emal olunur...")
                            .padding()
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12))
                    }
                }
            }
            .alert("Məlumat", isPresented: Binding(
                get: { vm.alertText != nil },
                set: { if !$0 { vm.alertText = nil } }
            )) {
                Button("Bağla", role: .cancel) { vm.alertText = nil }
            } message: {
                Text(vm.alertText ?? "")
            }
        }
    }
}

@main
struct ASANMuracietApp: App {
    var body: some Scene {
        WindowGroup {
            ASANMuracietHomeView()
        }
    }
}
